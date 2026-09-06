import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('me/graph')
  @ApiOperation({ summary: 'Vista 360 (INVS Graph) del contacto propio' })
  getMyGraph(@CurrentUser('id') userId: string) {
    return this.contactsService.getGraphByUserId(userId);
  }

  @Get(':id/graph')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: '[Staff/Admin] Vista 360 (INVS Graph) de cualquier contacto' })
  getGraph(@Param('id') id: string) {
    return this.contactsService.getGraph(id);
  }
}
