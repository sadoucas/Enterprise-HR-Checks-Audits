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
import { ChecklistsService } from './checklists.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateChecklistDto, CompleteChecklistDto, VerifyChecklistDto } from './dto';

@Controller('checklists')
@UseGuards(JwtGuard)
export class ChecklistsController {
  constructor(private checklistsService: ChecklistsService) {}

  /**
   * Create a new checklist template
   */
  @Post()
  async createChecklist(@Body() dto: CreateChecklistDto) {
    return this.checklistsService.createChecklist(dto);
  }

  /**
   * Get all checklists for a site
   */
  @Get('site/:siteId')
  async getChecklistsBySite(@Param('siteId') siteId: string) {
    return this.checklistsService.getChecklistsBySite(siteId);
  }

  /**
   * Get pending checklists
   */
  @Get('status/pending')
  async getPendingChecklists(@Query('siteId') siteId?: string) {
    return this.checklistsService.getPendingChecklists(siteId);
  }

  /**
   * Get in-progress checklists
   */
  @Get('status/in-progress')
  async getInProgressChecklists(@Query('siteId') siteId?: string) {
    return this.checklistsService.getInProgressChecklists(siteId);
  }

  /**
   * Get completed checklists
   */
  @Get('status/completed')
  async getCompletedChecklists(@Query('siteId') siteId?: string) {
    return this.checklistsService.getCompletedChecklists(siteId);
  }

  /**
   * Get checklist statistics
   */
  @Get('stats/overview')
  async getChecklistStats(@Query('siteId') siteId?: string) {
    return this.checklistsService.getChecklistStats(siteId);
  }

  /**
   * Get a single checklist by ID
   */
  @Get(':id')
  async getChecklistById(@Param('id') id: string) {
    return this.checklistsService.getChecklistById(id);
  }

  /**
   * Complete a checklist
   */
  @Post(':id/complete')
  async completeChecklist(@Param('id') id: string, @Body() dto: CompleteChecklistDto) {
    return this.checklistsService.completeChecklist(id, dto);
  }

  /**
   * Verify a completed checklist
   */
  @Post(':id/verify')
  async verifyChecklist(@Param('id') id: string, @Body() dto: VerifyChecklistDto) {
    return this.checklistsService.verifyChecklist(id, dto);
  }

  /**
   * Get checklist responses
   */
  @Get(':id/responses')
  async getChecklistResponses(@Param('id') id: string) {
    return this.checklistsService.getChecklistResponses(id);
  }

  /**
   * Delete a checklist (only PENDING)
   */
  @Delete(':id')
  async deleteChecklist(@Param('id') id: string) {
    return this.checklistsService.deleteChecklist(id);
  }
}
