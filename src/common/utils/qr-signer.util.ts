import * as crypto from 'crypto';

/**
 * Payload firmado del QR de una entrada. A propósito NO incluye el holder
 * (quién la tiene asignada): con entradas transferibles el dueño cambia
 * después de emitido el QR, y este payload no debe invalidarse por eso.
 * validate() siempre re-lee la verdad (holder/status) desde la BD por ticketId.
 */
export interface QrPayloadData {
  ticketId: string;
  eventId: string;
  categoryId: string;
  issuedAt: number;
  expiresAt: number;
}

export function signQrPayload(data: QrPayloadData, secret: string): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
}

export function buildQrPayload(data: QrPayloadData, secret: string): string {
  const signature = signQrPayload(data, secret);
  return JSON.stringify({ ...data, signature });
}
