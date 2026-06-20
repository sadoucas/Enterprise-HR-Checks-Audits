import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SendMessageDto, MarkAsReadDto, MarkAsDeliveredDto, ReplyToMessageDto } from './dto';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Controller('messages')
@UseGuards(JwtGuard)
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  /**
   * Send a message
   */
  @Post()
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.messagingService.sendMessage(dto);
  }

  /**
   * Get inbox
   */
  @Get('inbox')
  async getInbox(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.messagingService.getInbox(
      req.user.id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0
    );
  }

  /**
   * Get sent messages
   */
  @Get('sent')
  async getSentMessages(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.messagingService.getSentMessages(
      req.user.id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0
    );
  }

  /**
   * Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    return this.messagingService.getUnreadCount(req.user.id);
  }

  /**
   * Search messages
   */
  @Get('search')
  async searchMessages(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string
  ) {
    if (!query) {
      return { messages: [] };
    }
    return this.messagingService.searchMessages(req.user.id, query);
  }

  /**
   * Get message statistics
   */
  @Get('stats')
  async getMessageStats(@Req() req: AuthenticatedRequest) {
    return this.messagingService.getMessageStats(req.user.id);
  }

  /**
   * Get a single message
   */
  @Get(':id')
  async getMessage(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.messagingService.getMessage(id, req.user.id);
  }

  /**
   * Mark messages as read
   */
  @Post('mark-as-read')
  async markAsRead(@Req() req: AuthenticatedRequest, @Body() dto: MarkAsReadDto) {
    return this.messagingService.markAsRead(req.user.id, dto);
  }

  /**
   * Mark messages as delivered
   */
  @Post('mark-as-delivered')
  async markAsDelivered(@Req() req: AuthenticatedRequest, @Body() dto: MarkAsDeliveredDto) {
    return this.messagingService.markAsDelivered(req.user.id, dto);
  }

  /**
   * Reply to a message
   */
  @Post(':id/reply')
  async replyToMessage(
    @Param('id') id: string,
    @Body() dto: ReplyToMessageDto
  ) {
    return this.messagingService.replyToMessage(id, dto);
  }

  /**
   * Delete a message
   */
  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.messagingService.deleteMessage(id, req.user.id);
  }
}
