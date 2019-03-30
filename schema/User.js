const Joi = require('joi');
module.exports = class User {
    constructor(args={}, config={}) {
        Object.assign(this, {

        }, args)

        this.register = Joi.object().keys({
            createdAt: Joi.date().default(new Date(), 'time of creation'),
            email: Joi.string().email({ minDomainAtoms: 2 }).required(),
            password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required(),
            status: Joi.boolean().default(true),
            role: Joi.string().default('subscriber')
            // defaultAddress: Joi.objectId(),
            // defaultPaymentMethod: Joi.objectId(),
            // shippingCarrier: Joi.array().default(["fedex"]),
        });
    }
}