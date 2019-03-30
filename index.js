var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var moment = require('moment');
var mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const Joi = require('joi');
const Util = require('@knesk/util')()

const _config = require('./config')
const  Middlewares = require('./Middlewares');
const User = require('./model/User');
const Email = require('./controller').Email;


class Auth {
    constructor(config={}) {
        // Object.assign(this, {

        // }, args)
        
        this.config = Object.assign({}, _config, config||{});

        global.USERID = null
        global.USER = null

        // Fallbacks for Sapp Frameworks
        if (typeof(Hook) == 'undefined') global.Hook = require('@knesk/hook')()

        if (typeof(Db) == 'undefined') {
            console.log('aa')
            global.DbConn = MongoClient.connect('mongodb://127.0.0.1:27017', { useNewUrlParser: true })
            global.Db = DbConn.db('kneskdb')
        }

        if (typeof(_e) == 'undefined') {
            global._e = (text ) => {
                // console.log('Fallback Translate')
                return text
            }
        }

        if (typeof(APP_SECRET) == 'undefined') { 
            global.APP_SECRET = this.config.appSecret
        }

        // Auth Specific Code
        this.Middlewares = Middlewares        
        this.Email = new Email(this.config)    
        this.User = new User()
        this._actions()

        global.Auth_Module = this
        global.Auth_Module_Config = this.config
    }
    
    async init() {
        
    }

    _actions() {
        Hook.Action.add('Www/Init', async (args) => {
            this.buildRoutes()
        })

        // Hook.Action.add('I18n/Init', async (args) => {
        //     Sapp['Core/I18n'].loadTextDomain('Core/Auth', Sapp.dirPlugin + '/Core/Auth/language')
        // })

        Hook.Action.add('Auth/ResetPassword/BeforePayloadSend', async (args) => {
            await this.Email.sendForgotPasswordEmail(args)
        })
    }

    buildRoutes() {
        var router = express.Router();
        var routerProtected = express.Router();

        router.route('/').get((req,res,next) => {
            res.send('Auth Module Ok')
        })

        router.route('/register')
            .post((req, res) => {
                this.register(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
        })

        // router.route('/check')
        //     .post((req, res) => {
        //         res.send(translate('No credentials sent!', 'Core/Auth'))
        // })
            // this.config.routes.indexOf('/login')!==-1 &&
        router.route('/login')
            .post((req, res) => {
                this.login(req).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })

        router.route('/password/update')
            .post((req, res) => {
                this.changePassword(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })

        router.route('/password/email')
            .post((req, res) => {
                this.passwordEmail(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })


        router.route('/password/reset')
            .post((req, res) => {
                this.passwordReset(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })

        
        router.route('/me')
            .post([Middlewares.authMiddleware],(req, res) => {
                this.me(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })

        router.route('/me/update')
            .put([Middlewares.authMiddleware], (req, res) => {
                this.meUpdate(req.body).then((data) => {
                    res.send(data)
                }).catch((err) => {
                    res.status(401).send(err)
                })
            })
        
        Sapp['Core/Www'].app.use('/auth', router)
        // this.eApp.use('/auth', [this.Middlewares.authMiddleware] ,routerProtected)
    }


    _createHash(password) {
        if(!password) {
            password = Math.floor(Math.random() * 90000) + 10000000
        }
        return bcrypt.hashSync(password.toString(), 10)
    }

    async checkEmailExists(email=null) {
        const user = await this.User.collection.findOne({email: email})
        if(user) return true
        return false
    }

    async findUserByUserName(username=null) {
        let errorMessage = null
        if(!username) errorMessage = 'User not found.'
        let user = await this.User.collection.findOne({email: username.toLowerCase()})
        if (!user) errorMessage = 'User not found.'
        if(errorMessage) {
            return {
                error: errorMessage
            }
        }

        return user
    }
    

    async generateLoginToken(user) {   
        try {
            let payload = {
                _id: user._id,
                email: user.email,
                role: user.role
            }

            let result = await Hook.Filter.apply('Auth/LoginTokenPayload', payload, user)
            
            var token = await jwt.sign(result[0], APP_SECRET)
            return token
        } catch (err) {
            console.log(err)
            return {
                error: 'Cannot get token.'
            }
            // throw (Response.print(false, null, 'Server error token.'))
        }
    }

    async login(req) {
        
        try {
            let reqBody = req.body
            await Hook.Action.do('Auth/PreLogin', reqBody)
    
            let schema = Joi.object().keys({
                // username: Joi.string().email({ minDomainAtoms: 2 }).required(),
                username: Joi.string().required(),
                password: Joi.string().regex(/^[a-zA-Z0-9!@#$%^&*]{3,30}$/).required(),
                // captcha_token: Joi.string().required(),
                // appName: Joi.string().required(),
            });
            const result = Joi.validate(reqBody, schema, {
                stripUnknown: true
            });

            if(result.error) {
                throw(Util.Response.print(false, result.error.details, ''))
            }

            

            // console.log(result.value.username.toLowerCase());
            // let user = await this.User.collection.findOne({email: result.value.username.toLowerCase()})
            // if (!user) throw (Util.Response.print(false, null, 'User not found.'))
            
            let user = await this.findUserByUserName(result.value.username)
            if(user.error) throw (Util.Response.print(false, null, user.error))

            if (!user.status) throw (Util.Response.print(false, null, 'User is disabled.'))
            
            if (!bcrypt.compareSync(result.value.password, user.password)) throw (Util.Response.print(false, null, 'Authentication failed.'))

            
            // var payload = {
            //     _id: user._id,
            //     email: user.email,
            //     role: user.role
            // }

            // // console.log(APP_SECRET)
            // var token = await jwt.sign(payload, APP_SECRET)

            let token = await this.generateLoginToken(user)
            if(token.error) throw (Util.Response.print(false, 't failed', 'Authentication failed.'))

            var returnObj = {
                token: token,
                _id: user._id
            }

            await Hook.Action.do('Auth/Login/BeforeResponseReturn', user, req)
            return returnObj

        } catch(e) {
            console.log(e)
            throw(e)
        }
    }


    async register(reqBody) {
        try {
            // let schema = Joi.object().keys({
            //     email: Joi.string().email({ minDomainAtoms: 2 }).required(),
            //     password: Joi.string().regex(/^[a-zA-Z0-9!@#$%^&*]{3,30}$/).required()
            // });

            const result = Joi.validate(reqBody, this.User.schema.register, {
                stripUnknown: true
            });

            if(result.error) {
                return (Util.Response.print(false, result.error.details, ''))
            }
            
            if(reqBody.email){
                reqBody.email = reqBody.email.toLowerCase()
            }
            if(result.error) {
                return Util.Response.print(false, result.error.details, '')
            }

            result.value['password'] = this._createHash(result.value['password'])

            const user = await this.User.collection.save(result.value)
            // console.log(user)

            return Util.Response.print(true, result.value, 'User successfully registered.')

        } catch(e) {
            console.log(e)
            throw(e)
        }
    }

    async changePassword(reqBody) {
        try {
            let schema = Joi.object().keys({
                    id: Joi.string().required(),
                    password: Joi.string().regex(/^[a-zA-Z0-9!@#$%^&*]{3,30}$/).required(), 
                    passwordOld: Joi.string().regex(/^[a-zA-Z0-9!@#$%^&*]{3,30}$/).required()
            });

            const result = Joi.validate(reqBody, schema);

            if(result.error) {
                throw (Util.Response.print(false, result.error.details, 'Unable to change password'))
            }
            var o_id = new mongo.ObjectID(result.value.id);

            let user = await this.User.collection.findOne({_id: o_id})
            if (!user) throw (Util.Response.print(false, null, 'User not found.'))
            if (!user.status) throw (Util.Response.print(false, null, 'User is disabled.'))
            
            
            if (!bcrypt.compareSync(result.value.passwordOld, user.password)) throw (Util.Response.print(false, null, 'Authentication failed.'))

            let password = this._createHash(result.value.password)
            await this.User.collection.update({
                _id: o_id
            }, {
                $set: {
                    password: password
                }
            })

            return Util.Response.print(true, null, 'Password changed successfully.')

            // try {
            // } catch (err) {
            //     console.log(err)
            //     throw (Util.Response.print(false, null, 'Server error.'))
            // }
        

            // throw (Util.Response.print(false, null, 'Cannot change password.'))
        } catch(e) {
            console.log(e)
            throw (Util.Response.print(false, null, 'Server error.'))
        }
    }


    async passwordEmail(reqBody) {
        try {
            await Hook.Action.do('Auth/PrePasswordEmail', reqBody)

            let schema = Joi.object().keys({
                email: Joi.string().email({ minDomainAtoms: 2 }).required(),
                // captcha_token: Joi.string().required(),
            });

            const result = Joi.validate(reqBody, schema, {
                stripUnknown: true
            });

            if(result.error) {
                return Util.Response.print(false, result.error.details, '')
            }
            

            // let user = await this.User.collection.findOne({email: result.value.email})
            // if (!user) throw (Util.Response.print(false, null, 'User not found.'))

            let user = await this.findUserByUserName(result.value.email)
            if(user.error) throw (Util.Response.print(false, null, user.error))

            if (!user.status) throw (Util.Response.print(false, null, 'User is disabled.'))

            let passwordToken = Math.floor(Math.random() * 90000) + 10000;
            let today = new Date();
            today.setHours(today.getHours() + 1);

            await this.User.collection.update({
                email: result.value.email
            }, {
                $set: {
                    resetToken: passwordToken,
                    resetTokenExpires : today
                }
            })

            let response = {
                email: user.email,
                _id: user._id
            }
            Hook.Action.do('Auth/ResetPassword/BeforePayloadSend', {
                user: user,
                response: response
            })

            return Util.Response.print(true, response, 'Reset code sent successfully.')
        } catch(e) {
            console.log(e)
            throw(e)
        }
    }

    async passwordReset(reqBody) {
        try {
            await Hook.Action.do('Auth/PrePasswordReset', reqBody)

            let schema = Joi.object().keys({
                id: Joi.string().required(),
                resetToken: Joi.string().required(),
                password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
                // captcha_token: Joi.string().required(),
            });

            const result = Joi.validate(reqBody, schema, {
                stripUnknown: true
            });

            if(result.error) {
                throw(Util.Response.print(false, result.error.details, 'Validation failed.'))
            }

            var o_id = new mongo.ObjectID(result.value.id);
            let user = await this.User.collection.findOne({_id: o_id})
            if (!user) throw (Util.Response.print(false, null, 'User not found.'))
            if (!user.status) throw (Util.Response.print(false, null, 'User is disabled.'))

            if (moment(user.resetTokenExpires).isValid()) {
                var startTime = new Date();
                var difference = user.resetTokenExpires.getTime() - startTime.getTime(); // This will give difference in milliseconds
                var resultInMinutes = Math.round(difference / 60000);
                // less than 2 minute to expire
                if (resultInMinutes < 2) {

                    await this.User.collection.update({
                        _id: o_id
                    }, {
                        $set: {
                            resetToken: null,
                            resetTokenExpires : null
                        }
                    })
                    throw (Util.Response.print(false, null, 'Password token expired.'))
                }
            }

            if (user.resetToken == result.value.resetToken) {
                await this.User.collection.update({
                    _id: user._id
                }, {
                    $set: {
                        password: bcrypt.hashSync(reqBody['password'], 10),
                        resetToken: null,
                        resetTokenExpires : null
                    }
                })
            } else {
                throw (Util.Response.print(false, null, 'Wrong token supplied.'))
            }

            return Util.Response.print(true, null, 'Password reset successfully.')
        } catch(e) {
            console.log(e)
            throw(e)
        }
    }

    async me() {
        try {
            let user = await this.User.collection.findOne({_id: USER._id})
            
            if(!user) {
                throw (Util.Response.print(false, null, 'User not found.'))
            }

            let payload = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email.toLowerCase(),
                _id: user._id
            }

            const result = await Hook.Filter.apply('Auth/Me/BeforeResponseSend', payload, user)
            // console.log(result)

            return Util.Response.print(true, result[0], null)

            // return Util.Response.print(true, {
            //     email: user.email,
            //     _id: user._id
            // }, null)
        } catch (error) {
            console.log(error)
            throw(error)
        }
    }

    async meUpdate(reqBody) {
        await this.User.collection.update({
            _id: USER._id
        }, {
            $set: reqBody
        })
        return Util.Response.print(true, null, "User Successfully Updated")
    }
}

module.exports = (config) => new Auth(config)