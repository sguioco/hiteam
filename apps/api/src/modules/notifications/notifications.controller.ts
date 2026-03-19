import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  mine(@CurrentUser() user: JwtUser) {
    return this.notificationsService.listMine(user.sub);
  }

  @Get('me/unread-count')
  unreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Post(':notificationId/read')
  markRead(@CurrentUser() user: JwtUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markRead(user.sub, notificationId);
  }
}
