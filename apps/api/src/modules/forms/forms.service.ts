import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFormDto, SubmitFormDto, ApproveFormDto } from './dto';
import { FormStatus } from '@compliance/shared';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new form template
   */
  async createForm(dto: CreateFormDto) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.form.create({
      data: {
        title: dto.title,
        description: dto.description,
        departmentId: dto.departmentId,
        requiredFields: dto.requiredFields || [],
        signatureRequired: dto.signatureRequired || false,
        status: 'DRAFT',
        formData: JSON.stringify({}),
      },
    });
  }

  /**
   * Get all forms for a department
   */
  async getFormsByDepartment(departmentId: string) {
    return this.prisma.form.findMany({
      where: { departmentId },
      include: {
        department: true,
        responses: true,
        submittedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single form by ID
   */
  async getFormById(id: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        department: true,
        responses: true,
        submittedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    return form;
  }

  /**
   * Get all draft forms (for editing)
   */
  async getDraftForms() {
    return this.prisma.form.findMany({
      where: { status: 'DRAFT' },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a draft form
   */
  async updateForm(id: string, dto: Partial<CreateFormDto>) {
    const form = await this.getFormById(id);

    if (form.status !== 'DRAFT') {
      throw new BadRequestException('Can only edit forms in DRAFT status');
    }

    return this.prisma.form.update({
      where: { id },
      data: {
        title: dto.title || form.title,
        description: dto.description || form.description,
        requiredFields: dto.requiredFields || form.requiredFields,
        signatureRequired: dto.signatureRequired !== undefined ? dto.signatureRequired : form.signatureRequired,
      },
    });
  }

  /**
   * Publish a form (change from DRAFT to active)
   */
  async publishForm(id: string) {
    const form = await this.getFormById(id);

    if (form.status !== 'DRAFT') {
      throw new BadRequestException('Can only publish forms in DRAFT status');
    }

    return this.prisma.form.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  /**
   * Submit a form (employee fills and submits)
   */
  async submitForm(formId: string, dto: SubmitFormDto) {
    const form = await this.getFormById(formId);

    if (form.status === 'DRAFT') {
      throw new BadRequestException('Form is not yet published');
    }

    // Validate required fields
    const requiredFields = form.requiredFields as string[];
    const missingFields = requiredFields.filter(field => !dto.formData[field]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate signature if required
    if (form.signatureRequired && !dto.signature) {
      throw new BadRequestException('Signature is required for this form');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update form
    const updatedForm = await this.prisma.form.update({
      where: { id: formId },
      data: {
        status: 'SUBMITTED',
        submittedById: dto.userId,
        submittedAt: new Date(),
        formData: JSON.stringify(dto.formData),
        signatureData: dto.signature ? JSON.stringify(dto.signature) : null,
      },
    });

    // Create response record
    await this.prisma.formResponse.create({
      data: {
        formId,
        responseData: JSON.stringify({
          submittedBy: user.email,
          submittedAt: new Date(),
          data: dto.formData,
          signature: dto.signature ? 'present' : 'none',
        }),
      },
    });

    return updatedForm;
  }

  /**
   * Approve a submitted form (admin/manager)
   */
  async approveForm(formId: string, dto: ApproveFormDto) {
    const form = await this.getFormById(formId);

    if (form.status !== 'SUBMITTED') {
      throw new BadRequestException('Can only approve forms in SUBMITTED status');
    }

    return this.prisma.form.update({
      where: { id: formId },
      data: {
        status: 'APPROVED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Reject a submitted form (admin/manager)
   */
  async rejectForm(formId: string, reason: string) {
    const form = await this.getFormById(formId);

    if (form.status !== 'SUBMITTED') {
      throw new BadRequestException('Can only reject forms in SUBMITTED status');
    }

    return this.prisma.form.update({
      where: { id: formId },
      data: {
        status: 'REJECTED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get form responses
   */
  async getFormResponses(formId: string) {
    return this.prisma.formResponse.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a form (only DRAFT forms)
   */
  async deleteForm(id: string) {
    const form = await this.getFormById(id);

    if (form.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete forms in DRAFT status');
    }

    // Delete all responses first
    await this.prisma.formResponse.deleteMany({
      where: { formId: id },
    });

    return this.prisma.form.delete({
      where: { id },
    });
  }

  /**
   * Get form statistics
   */
  async getFormStats(departmentId?: string) {
    const where = departmentId ? { departmentId } : {};

    const total = await this.prisma.form.count({ where });
    const draft = await this.prisma.form.count({
      where: { ...where, status: 'DRAFT' },
    });
    const approved = await this.prisma.form.count({
      where: { ...where, status: 'APPROVED' },
    });
    const submitted = await this.prisma.form.count({
      where: { ...where, status: 'SUBMITTED' },
    });
    const rejected = await this.prisma.form.count({
      where: { ...where, status: 'REJECTED' },
    });

    return {
      total,
      draft,
      approved,
      submitted,
      rejected,
    };
  }
}
