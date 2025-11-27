import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 ora
const MAX_REQUESTS_PER_WINDOW = 5; // max 5 email all'ora per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Prima richiesta o finestra scaduta
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Limite raggiunto
  }

  record.count++;
  return true;
}

function sanitizeInput(input: string): string {
  // Rimuovi HTML tags e caratteri pericolosi
  return input
    .replace(/<[^>]*>/g, '') // Rimuovi HTML
    .replace(/[<>"']/g, '') // Rimuovi caratteri pericolosi
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting basato su IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un\'ora.' },
        { status: 429 }
      );
    }

    const data = await request.json();
    let { name, phone, email, subject, message } = data;

    // Validate required fields
    if (!name || !phone || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tutti i campi sono obbligatori' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    name = sanitizeInput(name);
    phone = sanitizeInput(phone);
    email = sanitizeInput(email);
    subject = sanitizeInput(subject);
    message = sanitizeInput(message);

    // Validate lengths
    if (name.length < 8 || name.length > 100) {
      return NextResponse.json(
        { error: 'Nome non valido (8-100 caratteri)' },
        { status: 400 }
      );
    }

    if (subject.length < 6 || subject.length > 200) {
      return NextResponse.json(
        { error: 'Oggetto non valido (6-200 caratteri)' },
        { status: 400 }
      );
    }

    if (message.length < 20 || message.length > 2000) {
      return NextResponse.json(
        { error: 'Messaggio non valido (20-2000 caratteri)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 100) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    // Validate phone format
    const phoneDigits = phone.replace(/[\s\-\+]/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15 || !/^[0-9+\s\-]+$/.test(phone)) {
      return NextResponse.json(
        { error: 'Numero di telefono non valido' },
        { status: 400 }
      );
    }

    // Validate name contains only letters
    if (!/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s']+$/.test(name)) {
      return NextResponse.json(
        { error: 'Il nome può contenere solo lettere' },
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
