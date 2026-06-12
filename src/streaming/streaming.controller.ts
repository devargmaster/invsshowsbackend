import {
  Controller, Get, Post, Param, Body, Headers, UseGuards, RawBodyRequest, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Streaming')
@Controller('streaming')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':eventId/token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @ApiOperation({ summary: 'Obtener token de playback firmado para stream en vivo (requiere suscripción)' })
  getLiveToken(@Param('eventId') eventId: string) {
    return this.streamingService.getLiveStreamToken(eventId);
  }

  // ── Admin: crear live stream en Mux ─────────────────────────────
  @Post(':eventId/create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Crear live stream en Mux para un evento' })
  createLiveStream(@Param('eventId') eventId: string) {
    return this.streamingService.createLiveStream(eventId);
  }

  // ── Webhook del proveedor activo (sin auth — verificación de firma interna) ─
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook del proveedor de streaming activo (Mux, YouTube, etc.)' })
  handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('mux-signature') muxSig: string,
    @Headers('x-hub-signature') youtubeSig: string,
  ) {
    // Cada proveedor sabe qué header de firma usar internamente
    const signature = muxSig ?? youtubeSig ?? '';
    return this.streamingService.handleWebhook(body, signature);
  }
}
