import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { WarningsService } from './warnings.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { IssueWarningDto, AcknowledgeWarningDto, AppealWarningDto, ResolveWarningDto } from './dto';

@Controller('warnings')
@UseGuards(JwtGuard)
export class WarningsController {
  constructor(private warningsService: WarningsService) {}

  /**
   * Issue a new warning
   */
  @Post()
  async issueWarning(@Body() dto: IssueWarningDto) {
    return this.warningsService.issueWarning(dto);
  }

  /**
   * Get warnings issued by a user
   */
  @Get('issued/:userId')
  async getWarningsIssuedBy(@Param('userId') userId: string) {
    return this.warningsService.getWarningsIssuedBy(userId);
  }

  /**
   * Get warnings received by a user
   */
  @Get('received/:userId')
  async getWarningsReceivedBy(@Param('userId') userId: string) {
    return this.warningsService.getWarningsReceivedBy(userId);
  }

  /**
   * Get pending warnings (ISSUED status)
   */
  @Get('status/pending')
  async getPendingWarnings() {
    return this.warningsService.getPendingWarnings();
  }

  /**
   * Get appealed warnings
   */
  @Get('status/appealed')
  async getAppealedWarnings() {
    return this.warningsService.getAppealedWarnings();
  }

  /**
   * Get warning statistics
   */
  @Get('stats/overview')
  async getWarningStats() {
    return this.warningsService.getWarningStats();
  }

  /**
   * Get a single warning by ID
   */
  @Get(':id')
  async getWarningById(@Param('id') id: string) {
    return this.warningsService.getWarningById(id);
  }

  /**
   * Acknowledge a warning
   */
  @Post(':id/acknowledge')
  async acknowledgeWarning(@Param('id') id: string, @Body() dto: AcknowledgeWarningDto) {
    return this.warningsService.acknowledgeWarning(id, dto);
  }

  /**
   * Appeal a warning
   */
  @Post(':id/appeal')
  async appealWarning(@Param('id') id: string, @Body() dto: AppealWarningDto) {
    return this.warningsService.appealWarning(id, dto);
  }

  /**
   * Resolve a warning
   */
  @Post(':id/resolve')
  async resolveWarning(@Param('id') id: string, @Body() dto: ResolveWarningDto) {
    return this.warningsService.resolveWarning(id, dto);
  }

  /**
   * Get user's warning history (issued & received)
   */
  @Get('history/:userId')
  async getUserWarningHistory(@Param('userId') userId: string) {
    return this.warningsService.getUserWarningHistory(userId);
  }
}
