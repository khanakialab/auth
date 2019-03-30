var nodemailer = require('nodemailer');
var Twig = require('twig');
var path = require('path');

class Email {
    constructor(config = {}) {
       this.config = Object.assign({}, {}, config);  
    }

    async sendRegistrationEmail(args) {
        const user = await mod.Auth.userTable.findOne({_id: args.user._id})
        // console.log(user)
        Twig.renderFile(path.join(this.config.dirView + '/registration.twig'), {
            companyName: config.companyTitle,
            fullName: user.fullName,
            email: user.email,
        }, (err, html) => {
            this.email(user.email, 'Registration Successful', html)
      });
    }

    async sendForgotPasswordEmail(args) {
        //console.log(args)
        const user = await Auth_Module.User.collection.findOne({_id: args.user._id})
        Twig.renderFile(path.join(this.config.dirView+ '/forgotPassword.twig'), {
            companyName: Auth_Module_Config.companyTitle, 
            fullName: user.fullName, 
            token: user.resetToken,
            link: Auth_Module_Config.resetPasswordUrl + "/?id=" + user._id +"&code="+ user.resetToken,
        }, (err, html) => {
            this.email(user.email, 'Reset Password', html)
            
        });
    }


    async email(to, subject, message) {
        let transporter = nodemailer.createTransport(Auth_Module_Config.mail.smtp);
        let mailOptions = {
            from: Auth_Module_Config.mail.from,
            to: to,
            subject: subject,
            //text: message,
            html: message
        };

        try {
            let res = await transporter.sendMail(mailOptions)
            console.log('Message sent: %s', res.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(res));
        } catch (error) {
            console.log(error)
        }
    }


}
module.exports = Email