const nodemailer = require("nodemailer")

class Email{
    constructor(user){
        this.from = "Moamen <moamen@gmail.com>"
        this.to = user.email
        this.firstName = user.name.split(" ")[0]
    }

    newTransporter(){
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        })
    }

    async sendPasswordResetURL(options){
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: options.subject,
            text: options.message,
            // html: 
        }
        await this.newTransporter().sendMail(mailOptions)
    }
}

module.exports = Email