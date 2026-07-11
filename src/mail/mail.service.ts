import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { MailProviderFactory } from './providers/mail-provider.factory';
import type { MailAttachment } from './providers/mail-provider.interface';

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#0B0B12;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#13131F;border:1px solid #1E1E33;border-radius:16px;padding:28px;">
      <div style="color:#A78BFA;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">INVS</div>
      <h1 style="color:#F0F0F5;font-size:20px;margin:12px 0 16px;">${title}</h1>
      <div style="color:#C4C4D4;font-size:14px;line-height:1.6;">${bodyHtml}</div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#A78BFA 0%,#7C3AED 100%);color:#fff;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:12px;">${label}</a>`;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly providerFactory: MailProviderFactory) {}

  /** Fire-and-forget: un fallo de mail nunca debe abortar una operación ya confirmada en BD. */
  private async safeSend(
    to: string,
    subject: string,
    html: string,
    attachments?: MailAttachment[],
  ): Promise<void> {
    try {
      await this.providerFactory.getProvider().send({ to, subject, html, attachments });
    } catch (err) {
      this.logger.error(`Error enviando mail a ${to} (${subject}): ${(err as Error).message}`);
    }
  }

  sendOrderConfirmation(to: string, eventTitle: string, ticketCount: number): void {
    const html = layout(
      '¡Compra confirmada!',
      `<p>Tu compra para <b>${eventTitle}</b> fue confirmada.</p>
       <p>Generamos <b>${ticketCount}</b> entrada(s). Entrá a la app en "Mis Entradas" para verlas y compartir las que no sean para vos.</p>`,
    );
    void this.safeSend(to, `Compra confirmada — ${eventTitle}`, html);
  }

  sendTransferInvitation(
    to: string,
    fromUserName: string,
    eventTitle: string,
    acceptUrl: string,
    ticket?: {
      qrPayload: string | null;
      eventDate?: Date | string;
      eventLocation?: string | null;
      categoryName?: string | null;
    },
  ): void {
    void (async () => {
      let attachments: MailAttachment[] | undefined;
      let qrHtml = '';

      // El QR va incrustado en el mail: el invitado puede entrar al evento
      // directo con esto (impreso o desde el celular), sin necesidad de
      // crear una cuenta. Aceptar la invitación en la app sigue disponible
      // para quien quiera gestionarla ahí.
      if (ticket?.qrPayload) {
        try {
          const qrPng = await QRCode.toBuffer(ticket.qrPayload, {
            width: 480,
            margin: 2,
            errorCorrectionLevel: 'M',
          });
          attachments = [
            {
              filename: 'entrada-invs.png',
              content: qrPng,
              contentType: 'image/png',
              cid: 'ticket-qr',
            },
          ];
          const fecha = ticket.eventDate
            ? new Date(ticket.eventDate).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : null;
          qrHtml = `
            ${fecha ? `<p style="margin:4px 0;">📅 ${fecha}</p>` : ''}
            ${ticket.eventLocation ? `<p style="margin:4px 0;">📍 ${ticket.eventLocation}</p>` : ''}
            ${ticket.categoryName ? `<p style="margin:4px 0;">Categoría: <b>${ticket.categoryName}</b></p>` : ''}
            <div style="background:#fff;border-radius:16px;padding:16px;text-align:center;margin:20px 0 8px;">
              <img src="cid:ticket-qr" alt="Código QR de tu entrada" width="240" height="240" style="display:block;margin:0 auto;" />
            </div>
            <p style="color:#8F8FA3;font-size:12px;margin-top:4px;">
              Con este código QR ya podés entrar al evento — mostralo impreso o desde tu celular.
              También va adjunto en este mail (entrada-invs.png).
            </p>`;
        } catch (err) {
          this.logger.error(`No se pudo generar el QR para el mail de invitación: ${(err as Error).message}`);
        }
      }

      const html = layout(
        'Te compartieron una entrada',
        `<p><b>${fromUserName}</b> te compartió una entrada para <b>${eventTitle}</b>.</p>
         ${qrHtml}
         <p style="margin-top:16px;">¿Querés tener la entrada en tu cuenta de INVS? Aceptala acá
         (si no tenés cuenta, la creás en el mismo paso):</p>
         ${button(acceptUrl, 'Aceptar en INVS')}
         <p style="margin-top:16px;color:#8F8FA3;font-size:12px;">El link de aceptación vence en 7 días. El QR sigue siendo válido para entrar al evento.</p>`,
      );
      await this.safeSend(to, `${fromUserName} te compartió una entrada — ${eventTitle}`, html, attachments);
    })();
  }

  sendTransferAccepted(to: string, eventTitle: string, recipientEmail: string): void {
    const html = layout(
      'Entrada aceptada',
      `<p><b>${recipientEmail}</b> aceptó la entrada que le compartiste para <b>${eventTitle}</b>.</p>`,
    );
    void this.safeSend(to, `Tu entrada compartida fue aceptada — ${eventTitle}`, html);
  }

  sendTransferCancelled(to: string, eventTitle: string): void {
    const html = layout(
      'Envío de entrada cancelado',
      `<p>Se canceló el envío de tu entrada pendiente para <b>${eventTitle}</b>. Podés volver a compartirla desde "Mis Entradas".</p>`,
    );
    void this.safeSend(to, `Envío de entrada cancelado — ${eventTitle}`, html);
  }

  sendTransferOrderApproved(to: string, eventTitle: string): void {
    const html = layout(
      '¡Pago aprobado!',
      `<p>Validamos tu transferencia para <b>${eventTitle}</b>. Tus entradas ya están activas con su código QR.</p>`,
    );
    void this.safeSend(to, `Pago aprobado — ${eventTitle}`, html);
  }

  sendTransferOrderRejected(to: string, eventTitle: string, reason?: string): void {
    const html = layout(
      'No pudimos validar tu pago',
      `<p>No pudimos validar la transferencia para <b>${eventTitle}</b>.</p>
       ${reason ? `<p>Motivo: ${reason}</p>` : ''}
       <p>Escribinos si creés que es un error.</p>`,
    );
    void this.safeSend(to, `Pago no validado — ${eventTitle}`, html);
  }

  sendContentPurchaseApproved(to: string, contentTitle: string): void {
    const html = layout(
      '¡Pago aprobado!',
      `<p>Validamos tu compra de <b>${contentTitle}</b>. Ya lo podés ver desde la sección Streaming.</p>`,
    );
    void this.safeSend(to, `Pago aprobado — ${contentTitle}`, html);
  }

  sendContentPurchaseRejected(to: string, contentTitle: string, reason?: string): void {
    const html = layout(
      'No pudimos validar tu pago',
      `<p>No pudimos validar la transferencia para <b>${contentTitle}</b>.</p>
       ${reason ? `<p>Motivo: ${reason}</p>` : ''}
       <p>Escribinos si creés que es un error.</p>`,
    );
    void this.safeSend(to, `Pago no validado — ${contentTitle}`, html);
  }
}
