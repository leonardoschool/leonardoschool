import { NextRequest, NextResponse } from 'next/server';

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

    // Here you can integrate with your email service
    // For now, we'll just log the data and return success
    console.log('Contact form submission:', data);

    // TODO: Integrate with email service (e.g., SendGrid, Resend, Nodemailer)
    // Example:
    // await sendEmail({
    //   to: 'info@leonardoschool.it',
    //   subject: `Nuovo messaggio da ${name}: ${subject}`,
    //   html: `
    //     <h2>Nuovo messaggio dal form di contatto</h2>
    //     <p><strong>Nome:</strong> ${name}</p>
    //     <p><strong>Telefono:</strong> ${phone}</p>
    //     <p><strong>Email:</strong> ${email}</p>
    //     <p><strong>Oggetto:</strong> ${subject}</p>
    //     <p><strong>Messaggio:</strong></p>
    //     <p>${message}</p>
    //   `
    // });

    return NextResponse.json(
      { message: 'Messaggio inviato con successo' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'invio del messaggio' },
      { status: 500 }
    );
  }
}
