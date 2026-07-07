import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  @Post('openpay/webhook')
  @ApiOperation({ summary: 'Webhook de Openpay (confirmaciones asíncronas)' })
  handleWebhook(@Body() body: unknown) {
    // TODO: verificar autenticidad del webhook con las credenciales reales
    // de Openpay Argentina (docs.ecommercebbva.com) una vez disponibles.
    // El flujo principal de cobro ya confirma el pago de forma síncrona en
    // POST /orders/:id/pay/card — esto queda como respaldo/extensión futura.
    this.logger.log(`Webhook de Openpay recibido: ${JSON.stringify(body)}`);
    return { received: true };
  }
}
