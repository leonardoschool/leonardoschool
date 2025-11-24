import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, phone, email, subject, message } = data;

    // Validate required fields
    if (!name || !phone || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    // Configure SMTP transporter with Aruba settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true', // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: `"Leonardo School - Sito Web" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      replyTo: email, // Allows replying directly to the sender
      subject: `Nuovo messaggio dal sito: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #dc2626; }
              .value { margin-top: 5px; padding: 10px; background-color: white; border-radius: 3px; }
              .footer { margin-top: 20px; padding: 15px; background-color: #111827; color: white; border-radius: 0 0 5px 5px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">📧 Nuovo messaggio dal form di contatto</h2>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">👤 Nome e Cognome:</div>
                  <div class="value">${name}</div>
                </div>
                <div class="field">
                  <div class="label">📱 Telefono:</div>
                  <div class="value">${phone}</div>
                </div>
                <div class="field">
                  <div class="label">✉️ Email:</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="field">
                  <div class="label">📋 Oggetto:</div>
                  <div class="value">${subject}</div>
                </div>
                <div class="field">
                  <div class="label">💬 Messaggio:</div>
                  <div class="value">${message.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">Messaggio ricevuto da: <strong>www.leonardoschool.it</strong></p>
                <p style="margin: 5px 0 0 0;">Puoi rispondere direttamente a questa email per contattare ${name}</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Nuovo messaggio dal form di contatto Leonardo School

Nome e Cognome: ${name}
Telefono: ${phone}
Email: ${email}
Oggetto: ${subject}

Messaggio:
${message}

---
Messaggio ricevuto da: www.leonardoschool.it
Rispondi a questa email per contattare direttamente ${name}
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log('Email sent successfully to:', process.env.EMAIL_TO);

    return NextResponse.json(
      { message: 'Messaggio inviato con successo' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'invio del messaggio. Riprova più tardi.' },
      { status: 500 }
    );
  }
}
