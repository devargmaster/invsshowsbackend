import * as crypto from 'crypto';

/**
 * Cifrado at-rest para credenciales de proveedores de pago guardadas en la
 * base (ej. access token de Mercado Pago), configurables desde el backoffice.
 * AES-256-GCM con la clave maestra en CREDENTIALS_MASTER_KEY (32 bytes,
 * base64 — generarla con `openssl rand -base64 32`). Formato de salida:
 * "iv:authTag:ciphertext", cada segmento en base64.
 */

function getMasterKey(): Buffer {
  const raw = process.env.CREDENTIALS_MASTER_KEY;
  if (!raw) {
    throw new Error('Falta configurar CREDENTIALS_MASTER_KEY en las variables de entorno.');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIALS_MASTER_KEY debe ser una clave de 32 bytes en base64.');
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(encoded: string): string {
  const key = getMasterKey();
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Formato de credencial cifrada inválido.');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function lastFourOf(secret: string): string {
  return secret.slice(-4);
}
