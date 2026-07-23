import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, service } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
    }

    const emailUser = process.env.EMAIL_USER || 'tiachinaglia@gmail.com';
    const emailPass = process.env.EMAIL_PASS;

    if (!emailPass) {
      console.error('EMAIL_PASS non configurato — serve una App Password Gmail');
      return NextResponse.json({ error: 'Configurazione email incompleta. Contatta direttamente tiachinaglia@gmail.com' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"Portfolio Tia Designs" <${process.env.EMAIL_USER || 'tiachinaglia@gmail.com'}>`,
      to: 'tiachinaglia@gmail.com',
      subject: `Nuovo messaggio da ${name} - Portfolio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff; border-radius: 12px; border: 1px solid #1e293b;">
          <h2 style="color: #2dd4bf; margin-bottom: 20px;">Nuovo messaggio dal Portfolio</h2>
          <div style="background: #111; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 4px 0;"><strong>Nome:</strong> ${name}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
            ${service ? `<p style="margin: 4px 0;"><strong>Servizio richiesto:</strong> ${service}</p>` : ''}
          </div>
          <div style="background: #111; padding: 16px; border-radius: 8px;">
            <p style="margin: 4px 0;"><strong>Messaggio:</strong></p>
            <p style="margin: 8px 0; line-height: 1.6;">${message}</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Ricevuto dal portfolio di Tia Designs</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email inviata con successo' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 });
  }
}
