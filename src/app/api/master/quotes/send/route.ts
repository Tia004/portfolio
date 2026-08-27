import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma, getDatabaseErrorMessage } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== 'master') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      quoteNumber,
      date,
      validity,
      timeline,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientAddress,
      clientVat,
      items,
      discount,
      taxRegime,
      paymentTerms,
      iban,
      notes,
      subtotal,
      total,
      customEmailMessage,
    } = body;

    if (!clientEmail || !quoteNumber || !clientName) {
      return NextResponse.json({ error: 'Email cliente, numero preventivo e nome sono obbligatori' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.NOTIFICATION_EMAIL || 'info@tiadesigns.it';

    const itemsList: Array<{ title: string; description: string; quantity: number; price: number }> =
      Array.isArray(items) ? items : [];

    const itemsHtml = itemsList.map((it, idx) => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
        <td style="padding: 12px 8px; color: #a3a3a3; font-family: monospace; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 12px 8px;">
          <strong style="color: #ffffff; font-size: 13px;">${it.title}</strong>
          ${it.description ? `<p style="margin: 4px 0 0 0; color: #a3a3a3; font-size: 11px; line-height: 1.4;">${it.description}</p>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #ffffff; font-family: monospace; font-size: 12px;">${it.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #ffffff; font-family: monospace; font-size: 12px;">${it.price} €</td>
        <td style="padding: 12px 8px; text-align: right; color: #2dd4bf; font-family: monospace; font-weight: bold; font-size: 13px;">${(Number(it.price) || 0) * (Number(it.quantity) || 1)} €</td>
      </tr>
    `).join('');

    const defaultIntro = `Grazie per l'interesse nei miei servizi di Design, Sviluppo Web e Produzione Video. Di seguito trovi la proposta dettagliata e il preventivo commerciale relativo al tuo progetto.`;

    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #e5e7eb; margin: 0; padding: 20px; }
          .container { max-width: 680px; margin: 0 auto; background-color: #081410; border: 1px solid rgba(45, 212, 191, 0.3); border-radius: 16px; overflow: hidden; }
          .header { padding: 30px; border-bottom: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(45, 212, 191, 0.08) 0%, transparent 100%); }
          .badge { display: inline-block; padding: 4px 12px; background: rgba(45, 212, 191, 0.15); border: 1px solid rgba(45, 212, 191, 0.4); color: #2dd4bf; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .body-content { padding: 30px; }
          .table-box { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary-card { background: rgba(0,0,0,0.4); border: 1px solid rgba(45, 212, 191, 0.25); border-radius: 12px; padding: 20px; margin-top: 25px; }
          .footer { padding: 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid rgba(255,255,255,0.08); font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <table style="width: 100%;">
              <tr>
                <td>
                  <h1 style="color: #ffffff; margin: 0 0 4px 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">Tia Designs</h1>
                  <p style="color: #2dd4bf; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Design • Sviluppo Web • Video</p>
                </td>
                <td style="text-align: right;">
                  <span class="badge">Preventivo Commerciale</span>
                  <p style="color: #ffffff; margin: 8px 0 0 0; font-family: monospace; font-size: 14px; font-weight: bold;">${quoteNumber}</p>
                </td>
              </tr>
            </table>
          </div>

          <div class="body-content">
            <p style="font-size: 16px; color: #ffffff; margin-top: 0;">Gentile <strong>${clientName}</strong>${clientCompany ? ` (${clientCompany})` : ''},</p>
            <p style="font-size: 14px; color: #d1d5db; line-height: 1.6;">
              ${customEmailMessage ? customEmailMessage.replace(/\n/g, '<br/>') : defaultIntro}
            </p>

            <div style="margin: 24px 0; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; font-size: 13px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #9ca3af;">Data emissione:</td>
                  <td style="color: #ffffff; text-align: right; font-weight: 500;">${date}</td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding-top: 6px;">Validità proposta:</td>
                  <td style="color: #ffffff; text-align: right; font-weight: 500; padding-top: 6px;">${validity}</td>
                </tr>
                <tr>
                  <td style="color: #9ca3af; padding-top: 6px;">Tempi di consegna stimati:</td>
                  <td style="color: #2dd4bf; text-align: right; font-weight: bold; padding-top: 6px;">${timeline}</td>
                </tr>
              </table>
            </div>

            <h3 style="color: #2dd4bf; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px 0;">Dettaglio Lavorazioni & Voci</h3>
            <table class="table-box">
              <thead>
                <tr style="border-bottom: 1px solid rgba(45, 212, 191, 0.3); text-align: left; font-size: 11px; text-transform: uppercase; color: #2dd4bf;">
                  <th style="padding: 8px;">#</th>
                  <th style="padding: 8px;">Descrizione</th>
                  <th style="padding: 8px; text-align: center;">Q.tà</th>
                  <th style="padding: 8px; text-align: right;">Unitario</th>
                  <th style="padding: 8px; text-align: right;">Totale</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="summary-card">
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="color: #9ca3af; padding-bottom: 6px;">Subtotale Voci:</td>
                  <td style="color: #ffffff; text-align: right; font-family: monospace; padding-bottom: 6px;">${subtotal} €</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="color: #2dd4bf; padding-bottom: 6px;">Sconto Applicato (${discount}%):</td>
                    <td style="color: #2dd4bf; text-align: right; font-family: monospace; font-weight: bold; padding-bottom: 6px;">- ${Math.round((subtotal * discount) / 100)} €</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 1px solid rgba(45, 212, 191, 0.3);">
                  <td style="color: #ffffff; font-size: 16px; font-weight: bold; padding-top: 10px;">TOTALE PREVENTIVATO:</td>
                  <td style="color: #2dd4bf; font-size: 22px; font-weight: bold; text-align: right; font-family: monospace; padding-top: 10px;">${total} €</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 24px; padding: 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; font-size: 12px; color: #9ca3af; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; color: #ffffff; font-weight: 600;">Condizioni & Pagamento:</p>
              <p style="margin: 0 0 4px 0;">• Modalità: <strong style="color: #d1d5db;">${paymentTerms}</strong></p>
              ${iban ? `<p style="margin: 0 0 4px 0;">• Bonifico Bancario IBAN: <strong style="color: #2dd4bf; font-family: monospace;">${iban}</strong></p>` : ''}
              ${notes ? `<p style="margin: 8px 0 0 0; color: #9ca3af; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">Note: ${notes}</p>` : ''}
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #d1d5db;">
              Resto a tua completa disposizione per qualsiasi chiarimento o per concordare l'avvio dei lavori.<br/>
              Un cordiale saluto,<br/><br/>
              <strong style="color: #ffffff; font-size: 15px;">Tia Chinaglia</strong><br/>
              <span style="color: #2dd4bf; font-size: 12px;">Tia Designs • tiadesigns.it</span>
            </p>
          </div>

          <div class="footer">
            Tia Designs • P.IVA: 02737630206 • info@tiadesigns.it • +39 331 882 1334
          </div>
        </div>
      </body>
      </html>
    `;

    // Tia confirmation email HTML
    const adminNotificationHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #030712; color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #081410; border: 1px solid #2dd4bf; border-radius: 12px; padding: 24px;">
          <h2 style="color: #2dd4bf; margin-top: 0;">✅ Preventivo Inviato con Successo!</h2>
          <p style="color: #d1d5db;">È stata inviata una copia del preventivo <strong>${quoteNumber}</strong> a <strong>${clientName}</strong> (${clientEmail}).</p>
          
          <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 3px 0;"><strong>Cliente:</strong> ${clientName} ${clientCompany ? `(${clientCompany})` : ''}</p>
            <p style="margin: 3px 0;"><strong>Email:</strong> ${clientEmail}</p>
            ${clientPhone ? `<p style="margin: 3px 0;"><strong>Telefono:</strong> ${clientPhone}</p>` : ''}
            <p style="margin: 3px 0;"><strong>Totale:</strong> <span style="color: #2dd4bf; font-family: monospace; font-weight: bold;">${total} €</span></p>
            <p style="margin: 3px 0;"><strong>Voci incluse:</strong> ${itemsList.length}</p>
          </div>

          <p style="color: #9ca3af; font-size: 12px;">Puoi visualizzare o modificare questo preventivo in qualsiasi momento dalla Master Dashboard.</p>
        </div>
      </body>
      </html>
    `;

    let emailSent = false;

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // 1. Send to client
      await resend.emails.send({
        from: 'Tia Designs <info@tiadesigns.it>',
        to: clientEmail,
        replyTo: adminEmail,
        subject: `Preventivo Commerciale ${quoteNumber} - Tia Designs`,
        html: clientEmailHtml,
      });

      // 2. Send confirmation to Tia
      await resend.emails.send({
        from: 'Tia Designs Hub <info@tiadesigns.it>',
        to: adminEmail,
        subject: `[Conferma Invio] Preventivo ${quoteNumber} inviato a ${clientName}`,
        html: adminNotificationHtml,
      });

      emailSent = true;
    } else {
      console.warn('RESEND_API_KEY non configurata. Simulazione invio email.');
    }

    // Update or create quote in Prisma with sent status
    const savedQuote = await prisma.quote.upsert({
      where: { quoteNumber },
      create: {
        quoteNumber,
        date: date || new Date().toISOString().split('T')[0],
        validity: validity || '30 giorni',
        timeline: timeline || '2-3 settimane',
        clientName,
        clientCompany: clientCompany || null,
        clientEmail,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        clientVat: clientVat || null,
        itemsJson: JSON.stringify(itemsList),
        discount: Number(discount) || 0,
        taxRegime: taxRegime || 'forfettario',
        paymentTerms: paymentTerms || '',
        iban: iban || '',
        notes: notes || null,
        subtotal: Number(subtotal) || 0,
        total: Number(total) || 0,
        status: 'sent',
        sentAt: new Date(),
      },
      update: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      emailSent,
      quote: savedQuote,
      message: `Preventivo inviato con successo a ${clientEmail} e notifica di conferma recapitata a ${adminEmail}`,
    });
  } catch (error: any) {
    console.error('Error sending quote email:', error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 500 });
  }
}
