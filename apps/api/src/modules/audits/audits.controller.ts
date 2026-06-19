import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuditsService } from './audits.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateAuditDto, CompleteAuditDto } from './dto';

@Controller('audits')
@UseGuards(JwtGuard)
export class AuditsController {
  constructor(private auditsService: AuditsService) {}

  /**
   * Create a new audit
   */
  @Post()
  async createAudit(@Body() dto: CreateAuditDto) {
    return this.auditsService.createAudit(dto);
  }

  /**
   * Get all audits for a site
   */
  @Get('site/:siteId')
  async getAuditsBySite(@Param('siteId') siteId: string) {
    return this.auditsService.getAuditsBySite(siteId);
  }

  /**
   * Get scheduled audits
   */
  @Get('status/scheduled')
  async getScheduledAudits(@Query('siteId') siteId?: string) {
    return this.auditsService.getScheduledAudits(siteId);
  }

  /**
   * Get in-progress audits
   */
  @Get('status/in-progress')
  async getInProgressAudits(@Query('siteId') siteId?: string) {
    return this.auditsService.getInProgressAudits(siteId);
  }

  /**
   * Get completed audits
   */
  @Get('status/completed')
  async getCompletedAudits(@Query('siteId') siteId?: string) {
    return this.auditsService.getCompletedAudits(siteId);
  }

  /**
   * Get audit statistics
   */
  @Get('stats/overview')
  async getAuditStats(@Query('siteId') siteId?: string) {
    return this.auditsService.getAuditStats(siteId);
  }

  /**
   * Get a single audit by ID
   */
  @Get(':id')
  async getAuditById(@Param('id') id: string) {
    return this.auditsService.getAuditById(id);
  }

  /**
   * Start an audit
   */
  @Post(':id/start')
  async startAudit(@Param('id') id: string) {
    return this.auditsService.startAudit(id);
  }

  /**
   * Complete an audit
   */
  @Post(':id/complete')
  async completeAudit(@Param('id') id: string, @Body() dto: CompleteAuditDto) {
    return this.auditsService.completeAudit(id, dto);
  }

  /**
   * Report an audit
   */
  @Post(':id/report')
  async reportAudit(@Param('id') id: string, @Body() reportData: any) {
    return this.auditsService.reportAudit(id, reportData);
  }

  /**
   * Get audit findings
   */
  @Get(':id/findings')
  async getAuditFindings(@Param('id') id: string) {
    return this.auditsService.getAuditFindings(id);
  }

  /**
   * Get audit responses
   */
  @Get(':id/responses')
  async getAuditResponses(@Param('id') id: string) {
    return this.auditsService.getAuditResponses(id);
  }

  /**
   * Delete an audit (only SCHEDULED)
   */
  @Delete(':id')
  async deleteAudit(@Param('id') id: string) {
    return this.auditsService.deleteAudit(id);
  }
}
