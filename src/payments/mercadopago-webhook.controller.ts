import { Body, Controller, Headers, Logger, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { OrdersService } from '../orders/orders.service';
import { ContentPurchasesService } from '../content-purchases/content-purchases.service';

/**
 * Webhook de Mercado Pago. Vive en un módulo aparte (no en PaymentsController)
 * porque necesita OrdersService/ContentPurchasesService para confirmar el
 * pago, y esos módulos ya importan PaymentsModule — ponerlo ahí crearía un
 * import circular.
 */
@ApiTags('Payments')
@Controller('payments/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly mercadoPagoProvider: MercadoPagoProvider,
    private readonly ordersService: OrdersService,
    private readonly contentPurchasesService: ContentPurchasesService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de Mercado Pago (confirmación asíncrona de pagos)' })
  async handleWebhook(
    @Body() body: { type?: string; action?: string; data?: { id?: string } },
    @Query() query: { type?: string; 'data.id'?: string },
    @Headers() headers: Record<string, string>,
  ) {
    const type = body?.type ?? query?.type;
    const dataId = body?.data?.id ?? query?.['data.id'];

    if (type !== 'payment' || !dataId) {
      this.logger.log(`Notificación de Mercado Pago ignorada (type=${type})`);
      return { received: true };
    }

    const signatureOk = await this.mercadoPagoProvider.verifyWebhookSignature(
      { 'x-signature': headers['x-signature'], 'x-request-id': headers['x-request-id'] },
      dataId,
    );
    if (!signatureOk) {
      this.logger.warn(`Firma inválida en webhook de Mercado Pago para payment ${dataId}`);
      throw new UnauthorizedException('Firma inválida.');
    }

    const payment = await this.mercadoPagoProvider.getPayment(dataId);
    const approved = payment.status === 'approved';

    const [kind, entityId] = (payment.externalReference ?? '').split(':');
    if (kind === 'order' && entityId) {
      await this.ordersService.confirmMercadoPagoPayment(entityId, dataId, approved);
    } else if (kind === 'content' && entityId) {
      await this.contentPurchasesService.confirmMercadoPagoPayment(entityId, dataId, approved);
    } else {
      this.logger.warn(`external_reference sin reconocer en webhook de Mercado Pago: "${payment.externalReference}"`);
    }

    return { received: true };
  }
}
