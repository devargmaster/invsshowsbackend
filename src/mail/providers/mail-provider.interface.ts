/**
 * Contrato que deben implementar todos los proveedores de mail.
 * Agregar un nuevo proveedor = crear una clase que implemente esta interfaz
 * y registrarla en MailProviderFactory. Mismo patrón que streaming/providers.
 */

export type MailProviderType = 'smtp' | 'console';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IMailProvider {
  readonly providerType: MailProviderType;
  send(input: SendMailInput): Promise<void>;
}
