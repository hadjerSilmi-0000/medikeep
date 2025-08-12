const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // Ethereal uses STARTTLS, so keep this false
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail({ to, subject, text, html }) {
    const msg = {
        from: `"MediKeep" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
    };

    const info = await transporter.sendMail(msg);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    return info;
}

module.exports = sendEmail;
