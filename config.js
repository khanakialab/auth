var path = require('path');
module.exports = {
    dirView: path.join(__dirname, './view'),
    appSecret: 'fa5673a321604657873b6dfe98415ebf',
    mail: {
        smtp: {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'wadbwamzqt2gemzw@ethereal.email',
                pass: '4XMy5cy2PduhbsSFdf',
            },
            tls: {
                rejectUnauthorized: false
            }
        },
    
        from: 'Knesk <noreply@knesk.com>', // sender address
    },
    companyName : 'Knesk',
    resetPasswordUrl : '', // Will send with Forgot Password Email
}