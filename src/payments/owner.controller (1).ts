import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OwnerService } from './owner.service (1)';
import { OwnerBookingsQueryDto } from './dto/owner-bookings-query.dto (1)';
// Loyihangizdagi mavjud guard/decorator'larga moslang:
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Mavjud OwnerController (dashboard, stadiums) bo'lsa, faqat getBookings metodini qo'shing.
// @Controller('owner') + @Get('bookings') => /owner/bookings (namunadagidek 'owner/bookings'
// yozsangiz, yo'l /owner/owner/bookings bo'lib qoladi).
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class OwnerController {
  constructor(private readonly owner: OwnerService) {}

  @Get('bookings')
  getBookings(
    @CurrentUser() user: { id: string; role: UserRole },
    @Query() query: OwnerBookingsQueryDto,
  ) {
    return this.owner.getBookings(user, query);
  }
}
