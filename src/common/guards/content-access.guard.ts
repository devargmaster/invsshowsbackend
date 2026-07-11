import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentAccessService } from '../services/content-access.service';
import { CONTENT_TARGET_KEY, ContentTargetType } from '../decorators/content-target.decorator';

/**
 * Reemplaza a SubscriptionGuard en las rutas que reproducen contenido
 * puntual (token de grabación / token de vivo) — a diferencia de aquel,
 * este SÍ mira el contenido pedido: puede ser gratis, estar incluido en
 * la suscripción, y/o haber sido comprado suelto. ADMIN/STAFF siempre
 * pasan, igual que antes.
 */
@Injectable()
export class ContentAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly contentAccess: ContentAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ type: ContentTargetType; paramName: string } | undefined>(
      CONTENT_TARGET_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) {
      // Sin @ContentTarget() no hay nada que evaluar — falla cerrado por
      // seguridad en vez de dejar pasar una ruta mal configurada.
      throw new ForbiddenException('Ruta mal configurada: falta @ContentTarget().');
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) throw new ForbiddenException('No autenticado.');

    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      return true;
    }

    const id = request.params[meta.paramName];

    if (meta.type === 'recording') {
      const recording = await this.prisma.recording.findUnique({ where: { id } });
      if (!recording) throw new NotFoundException('Grabación no encontrada.');
      const result = await this.contentAccess.checkRecordingAccess(user.id, recording);
      if (!result.granted) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'No tenés acceso a este contenido.',
          availableAccess: result.availableAccess,
        });
      }
      return true;
    }

    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado.');
    const result = await this.contentAccess.checkEventLiveAccess(user.id, event);
    if (!result.granted) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'No tenés acceso a esta transmisión en vivo.',
        availableAccess: result.availableAccess,
      });
    }
    return true;
  }
}
