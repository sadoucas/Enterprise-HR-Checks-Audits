import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FormsService } from './forms.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateFormDto, SubmitFormDto, ApproveFormDto } from './dto';

@Controller('forms')
@UseGuards(JwtGuard)
export class FormsController {
  constructor(private formsService: FormsService) {}

  /**
   * Create a new form template
   * Only ADMIN/MANAGER
   */
  @Post()
  async createForm(@Body() dto: CreateFormDto) {
    return this.formsService.createForm(dto);
  }

  /**
   * Get all forms for a department
   */
  @Get('department/:departmentId')
  async getFormsByDepartment(@Param('departmentId') departmentId: string) {
    return this.formsService.getFormsByDepartment(departmentId);
  }

  /**
   * Get all draft forms
   */
  @Get('draft')
  async getDraftForms() {
    return this.formsService.getDraftForms();
  }

  /**
   * Get a single form by ID
   */
  @Get(':id')
  async getFormById(@Param('id') id: string) {
    return this.formsService.getFormById(id);
  }

  /**
   * Update a draft form
   */
  @Put(':id')
  async updateForm(@Param('id') id: string, @Body() dto: Partial<CreateFormDto>) {
    return this.formsService.updateForm(id, dto);
  }

  /**
   * Publish a form
   */
  @Post(':id/publish')
  async publishForm(@Param('id') id: string) {
    return this.formsService.publishForm(id);
  }

  /**
   * Submit a form
   */
  @Post(':id/submit')
  async submitForm(@Param('id') id: string, @Body() dto: SubmitFormDto) {
    return this.formsService.submitForm(id, dto);
  }

  /**
   * Approve a submitted form
   */
  @Post(':id/approve')
  async approveForm(@Param('id') id: string, @Body() dto: ApproveFormDto) {
    return this.formsService.approveForm(id, dto);
  }

  /**
   * Reject a submitted form
   */
  @Post(':id/reject')
  async rejectForm(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.formsService.rejectForm(id, body.reason);
  }

  /**
   * Get form responses
   */
  @Get(':id/responses')
  async getFormResponses(@Param('id') id: string) {
    return this.formsService.getFormResponses(id);
  }

  /**
   * Get form statistics
   */
  @Get('stats/overview')
  async getFormStats(@Query('departmentId') departmentId?: string) {
    return this.formsService.getFormStats(departmentId);
  }

  /**
   * Delete a form (only DRAFT)
   */
  @Delete(':id')
  async deleteForm(@Param('id') id: string) {
    return this.formsService.deleteForm(id);
  }
}
