const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');

//https://ethereal.email/create
let nodeConfig = {
    host:"smtp.ethereal.email",
    port:587,
    auth:{
        user: 'makenna.parisian@ethereal.email',
        pass: '5xdTtu1mBaRT8BAnG7'
    }
}

let transporter = nodemailer.createTransport(nodeConfig);

let MailGenerator = new Mailgen({
    theme:"default",
    product:{
        name:"Mailgen",
        link:"https://mailgen.js"
    }
})

/** POST: http://localhost:9000/api/register-mail 
 * @param:{
    "username":"example",
    'useremail':'example@gmail.com',
    'text':"",
    "subject":""   
}
*/

const registerMail = async (req,res) => {
    const {username,userEmail,text,subject} = req.body;

    // body of the email
    let email = {
        body:{
            name:username,
            intro:text || 'Welcome to Daily tuition! We\'re very excited to have you on board.',
            outro:"Need help, or have questions? just reply to this email, we\'d love to help."
        }
    }

    let emailBody = MailGenerator.generate(email)

    let message = {
        from:process.env.EMAIL,
        to:userEmail,
        subject:subject || 'Signup Successfully',
        html:emailBody
    }

    // send mail
    transporter.sendMail(message)
        .then(() => {
            return res.status(200).send({ msg: "You should receive an email from us."})
        })
        .catch(error => res.status(500).send({ error }))
}

module.exports = {registerMail};