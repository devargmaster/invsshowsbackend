import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Listar planes disponibles' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('me')
  @ApiOperation({ summary: 'Ver mi suscripción activa' })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear o reactivar suscripción (admin puede pasar userId en body)' })
  create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.subscriptionsService.create(dto, user.id, isAdmin);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar mi suscripción' })
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancel(userId);
  }

  // ── Admin ──────────────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Listar todas las suscripciones' })
  findAll() {
    return this.subscriptionsService.findAll();
  }
}
