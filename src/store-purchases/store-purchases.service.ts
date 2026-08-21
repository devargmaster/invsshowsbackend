import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { CreateStorePurchaseDto } from './dto/create-store-purchase.dto';
import { PayCardDto } from './dto/pay-card.dto';
import { ValidateTransferDto } from './dto/validate-transfer.dto';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

export interface StorePurchaseFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
}

const INCLUDE = {
  user: { select: { id: true, email: true, fullName: true } },
  addon: true,
  variant: true,
};

@Injectable()
export class StorePurchasesService {
  private readonly logger = new Logger(StorePurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly paymentFactory: PaymentProviderFactory,
    private readonly mercadoPagoProvider: MercadoPagoProvider,
  ) {}

  // ─── Crear compra: sin reserva de cupo, no aplica (no hay aforo) ────
  async create(userId: string, userRole: UserRole, dto: CreateStorePurchaseDto) {
    if (userRole !== UserRole.USER) {
      throw new ForbiddenException('Las cuentas de staff/admin no pueden comprar en la Tienda. Iniciá sesión con una cuenta personal.');
    }

    const addon = await this.prisma.addOn.findUnique({ where: { id: dto.addonId }, include: { variants: true } });
    if (!addon) throw new NotFoundException('Producto no encontrado.');
    if (!addon.isActive || !addon.showInStore) {
      throw new BadRequestException('Este producto no está disponible en la Tienda.');
    }

    if (addon.hasVariants) {
      if (!dto.variantId) throw new BadRequestException('Este producto requiere elegir una variante.');
      if (!addon.variants.some((v) => v.id === dto.variantId)) {
        throw new BadRequestException('La variante indicada no corresponde a este producto.');
      }
    }

    const quantity = dto.quantity ?? 1;
    const priceCents = addon.priceCents * quantity;

    const ttlMs =
      dto.paymentMethod === PaymentMethod.CARD_OPENPAY || dto.paymentMethod === PaymentMethod.MERCADOPAGO
        ? (this.config.get<number>('orders.cardTtlMinutes') ?? 15) * 60_000
        : (this.config.get<number>('orders.transferTtlHours') ?? 72) * 3_600_000;
    const expiresAt = new Date(Date.now() + ttlMs);

    const purchase = await this.prisma.storePurchase.create({
      data: {
        userId,
        addonId: dto.addonId,
        variantId: dto.variantId,
        quantity,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.PENDING_PAYMENT,
        priceCents,
        currency: addon.currency,
        expiresAt,
      },
      include: INCLUDE,
    });

    return purchase;
  }

  // ─── Pagar con tarjeta (Openpay) ─────────────────────────────────
  async payCard(purchaseId: string, userId: string, dto: PayCardDto) {
    const purchase = await this.prisma.storePurchase.findUnique({
      where: { id: purchaseId },
      include: INCLUDE,
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException('No podés pagar una compra que no es tuya.');
    if (purchase.paymentMethod !== PaymentMethod.CARD_OPENPAY) {
      throw new BadRequestException('Esta compra no es de pago con tarjeta.');
    }
    if (purchase.status === OrderStatus.PAID) throw new ConflictException('Esta compra ya fue pagada.');
    if (purchase.status === OrderStatus.CANCELLED) throw new BadRequestException('Esta compra fue cancelada.');
    if (purchase.expiresAt && purchase.expiresAt < new Date()) {
      throw new BadRequestException('La compra venció, iniciá una nueva.');
    }

    const title = this.getProductTitle(purchase);
    const result = await this.paymentFactory.getProvider().charge({
      orderId: purchase.id,
      amountCents: purchase.priceCents,
      currency: purchase.currency,
      cardToken: dto.cardToken,
      deviceSessionId: dto.deviceSessionId,
      customerEmail: purchase.user.email,
      customerName: purchase.user.fullName,
      description: `INVS - ${title}`,
    });

    if (!result.success) {
      await this.prisma.storePurchase.update({
        where: { id: purchase.id },
        data: { status: OrderStatus.FAILED, paymentError: result.errorMessage },
      });
      throw new BadRequestException(result.errorMessage ?? 'El pago fue rechazado.');
    }

    await this.prisma.storePurchase.update({
      where: { id: purchase.id },
      data: { status: OrderStatus.PAID, openpayChargeId: result.chargeId, paidAt: new Date() },
    });

    this.mailService.sendStorePurchaseApproved(purchase.user.email, title);

    return this.findOne(purchase.id, { id: userId, role: 'USER' });
  }

  // ─── Iniciar pago con Mercado Pago (Checkout Pro) ────────────────
  async payMercadoPago(purchaseId: string, userId: string) {
    const purchase = await this.prisma.storePurchase.findUnique({
      where: { id: purchaseId },
      include: INCLUDE,
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException('No podés pagar una compra que no es tuya.');
    if (purchase.paymentMethod !== PaymentMethod.MERCADOPAGO) {
      throw new BadRequestException('Esta compra no es de pago con Mercado Pago.');
    }
    if (purchase.status === OrderStatus.PAID) throw new ConflictException('Esta compra ya fue pagada.');
    if (purchase.status === OrderStatus.CANCELLED) throw new BadRequestException('Esta compra fue cancelada.');
    if (purchase.expiresAt && purchase.expiresAt < new Date()) {
      throw new BadRequestException('La compra venció, iniciá una nueva.');
    }

    const title = this.getProductTitle(purchase);
    const { redirectUrl, preferenceId } = await this.mercadoPagoProvider.createPreference({
      externalReference: `store:${purchase.id}`,
      amountCents: purchase.priceCents,
      currency: purchase.currency,
      title: `INVS - ${title}`,
      payerEmail: purchase.user.email,
      returnPath: `/tienda/confirmacion/${purchase.id}`,
    });

    await this.prisma.storePurchase.update({
      where: { id: purchase.id },
      data: { mercadoPagoPreferenceId: preferenceId },
    });

    return { redirectUrl };
  }

  // ─── Sincronizar pago de Mercado Pago a demanda (ver mismo método en
  // OrdersService/ContentPurchasesService para la explicación completa de
  // la carrera con auto_return) ───────────────────────────────────
  async syncMercadoPagoPayment(purchaseId: string, userId: string, mpPaymentId: string) {
    const purchase = await this.prisma.storePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException('No podés consultar una compra que no es tuya.');
    if (purchase.paymentMethod !== PaymentMethod.MERCADOPAGO) {
      throw new BadRequestException('Esta compra no es de pago con Mercado Pago.');
    }

    if (purchase.status !== OrderStatus.PAID && purchase.status !== OrderStatus.CANCELLED) {
      const payment = await this.mercadoPagoProvider.getPayment(mpPaymentId);
      if (payment.externalReference === `store:${purchase.id}`) {
        await this.confirmMercadoPagoPayment(purchase.id, mpPaymentId, payment.status === 'approved');
      }
    }

    return this.findOne(purchase.id, { id: userId, role: 'USER' });
  }

  // ─── Confirmar pago de Mercado Pago (llamado desde el webhook) ───
  async confirmMercadoPagoPayment(purchaseId: string, mpPaymentId: string, approved: boolean) {
    const purchase = await this.prisma.storePurchase.findUnique({ where: { id: purchaseId }, include: INCLUDE });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');

    if (purchase.status === OrderStatus.PAID || purchase.status === OrderStatus.CANCELLED) {
      return; // idempotente: los webhooks de Mercado Pago pueden llegar duplicados
    }
    if (!approved) return;

    await this.prisma.storePurchase.update({
      where: { id: purchase.id },
      data: { status: OrderStatus.PAID, mercadoPagoPaymentId: mpPaymentId, paidAt: new Date() },
    });

    this.mailService.sendStorePurchaseApproved(purchase.user.email, this.getProductTitle(purchase));
  }

  // ─── Subir comprobante de transferencia ─────────────────────────
  async uploadTransferProof(purchaseId: string, userId: string, fileUrl: string, reference?: string) {
    const purchase = await this.prisma.storePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException();
    if (purchase.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Esta compra no es por transferencia.');
    }
    if (purchase.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Esta compra ya no está pendiente de pago.');
    }

    return this.prisma.storePurchase.update({
      where: { id: purchaseId },
      data: { transferProofUrl: fileUrl, transferReference: reference },
    });
  }

  // ─── Admin: validar (aprobar/rechazar) una transferencia ────────
  async validateTransfer(purchaseId: string, adminId: string, dto: ValidateTransferDto) {
    const purchase = await this.prisma.storePurchase.findUnique({
      where: { id: purchaseId },
      include: INCLUDE,
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Esta compra no es por transferencia.');
    }
    if (purchase.status !== OrderStatus.PENDING_PAYMENT) {
      throw new ConflictException('Esta compra ya fue procesada.');
    }

    const title = this.getProductTitle(purchase);

    if (dto.approve) {
      await this.prisma.storePurchase.update({
        where: { id: purchaseId },
        data: {
          status: OrderStatus.PAID,
          validatedByUserId: adminId,
          validatedAt: new Date(),
          paidAt: new Date(),
        },
      });
      this.mailService.sendStorePurchaseApproved(purchase.user.email, title);
    } else {
      await this.prisma.storePurchase.update({
        where: { id: purchaseId },
        data: {
          status: OrderStatus.CANCELLED,
          validatedByUserId: adminId,
          validatedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
      });
      this.mailService.sendStorePurchaseRejected(purchase.user.email, title, dto.rejectionReason);
    }

    return this.findOne(purchaseId, { id: adminId, role: 'ADMIN' });
  }

  // ─── Consultas ───────────────────────────────────────────────────
  async findMyPurchases(userId: string) {
    return this.prisma.storePurchase.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: { id: string; role: string }) {
    const purchase = await this.prisma.storePurchase.findUnique({ where: { id }, include: INCLUDE });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    const isOwner = purchase.userId === requestingUser.id;
    const isStaff = requestingUser.role === 'ADMIN' || requestingUser.role === 'STAFF';
    if (!isOwner && !isStaff) throw new ForbiddenException('No podés ver esta compra.');
    return purchase;
  }

  // ── Admin: listar (ej. cola de transferencias pendientes) ───────
  async findAllAdmin(filters: StorePurchaseFilters) {
    return this.prisma.storePurchase.findMany({
      where: {
        status: filters.status,
        paymentMethod: filters.paymentMethod,
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  private getProductTitle(purchase: { addon: { name: string } }): string {
    return purchase.addon.name;
  }
}
