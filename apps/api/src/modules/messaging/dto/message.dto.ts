import { IsString, IsOptional, IsArray } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsString()
  senderId: string;

  @IsArray()
  recipientIds: string[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  messageType?: 'ALERT' | 'NOTIFICATION' | 'WARNING' | 'GENERAL';

  @IsOptional()
  @IsString()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  attachments?: any[];
}

export class MarkAsReadDto {
  @IsArray()
  messageIds: string[];
}

export class MarkAsDeliveredDto {
  @IsArray()
  messageIds: string[];
}

export class ReplyToMessageDto {
  @IsString()
  content: string;

  @IsString()
  senderId: string;

  @IsOptional()
  attachments?: any[];
}
