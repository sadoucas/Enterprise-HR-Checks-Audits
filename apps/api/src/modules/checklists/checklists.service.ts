import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateChecklistDto, CompleteChecklistDto, VerifyChecklistDto } from './dto';
import { ChecklistStatus } from '@compliance/shared';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new checklist template
   */
  async createChecklist(dto: CreateChecklistDto) {
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return this.prisma.checklist.create({
      data: {
        title: dto.title,
        description: dto.description,
        siteId: dto.siteId,
        status: 'PENDING',
        items: JSON.stringify(dto.items),
        requiredFields: dto.requiredFields || [],
        signatureRequired: dto.signatureRequired || false,
        checklistData: JSON.stringify({}),
      },
    });
  }

  /**
   * Get all checklists for a site
   */
  async getChecklistsBySite(siteId: string) {
    return this.prisma.checklist.findMany({
      where: { siteId },
      include: {
        site: true,
        completedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single checklist by ID
   */
  async getChecklistById(id: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: {
        site: true,
        completedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
    });

    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    return checklist;
  }

  /**
   * Get pending checklists (awaiting completion)
   */
  async getPendingChecklists(siteId?: string) {
    const where = siteId ? { siteId, status: 'PENDING' } : { status: 'PENDING' };

    return this.prisma.checklist.findMany({
      where,
      include: { site: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get in-progress checklists
   */
  async getInProgressChecklists(siteId?: string) {
    const where = siteId ? { siteId, status: 'IN_PROGRESS' } : { status: 'IN_PROGRESS' };

    return this.prisma.checklist.findMany({
      where,
      include: {
        site: true,
        completedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get completed checklists
   */
  async getCompletedChecklists(siteId?: string) {
    const where = siteId ? { siteId, status: 'COMPLETED' } : { status: 'COMPLETED' };

    return this.prisma.checklist.findMany({
      where,
      include: {
        site: true,
        completedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Complete a checklist (employee fills and submits)
   */
  async completeChecklist(checklistId: string, dto: CompleteChecklistDto) {
    const checklist = await this.getChecklistById(checklistId);

    if (checklist.status === 'VERIFIED') {
      throw new BadRequestException('Checklist is already verified');
    }

    // Validate required fields
    const requiredFields = checklist.requiredFields as string[];
    const missingFields = requiredFields.filter(field => !dto.responses[field]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate signature if required
    if (checklist.signatureRequired && !dto.signature) {
      throw new BadRequestException('Signature is required for this checklist');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update checklist
    const updatedChecklist = await this.prisma.checklist.update({
      where: { id: checklistId },
      data: {
        status: 'COMPLETED',
        completedById: dto.userId,
        completedAt: new Date(),
        checklistData: JSON.stringify(dto.responses),
        signatureData: dto.signature ? JSON.stringify(dto.signature) : null,
      },
    });

    // Create response record
    await this.prisma.checklistResponse.create({
      data: {
        checklistId,
        responseData: JSON.stringify({
          completedBy: user.email,
          completedAt: new Date(),
          responses: dto.responses,
          signature: dto.signature ? 'present' : 'none',
        }),
      },
    });

    return updatedChecklist;
  }

  /**
   * Verify a completed checklist (manager/admin)
   */
  async verifyChecklist(checklistId: string, dto: VerifyChecklistDto) {
    const checklist = await this.getChecklistById(checklistId);

    if (checklist.status !== 'COMPLETED') {
      throw new BadRequestException('Can only verify completed checklists');
    }

    const verifier = await this.prisma.user.findUnique({
      where: { id: dto.verifiedById },
    });

    if (!verifier) {
      throw new NotFoundException('Verifier not found');
    }

    return this.prisma.checklist.update({
      where: { id: checklistId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: dto.verifiedById,
        verificationNotes: dto.notes,
      },
    });
  }

  /**
   * Get checklist responses
   */
  async getChecklistResponses(checklistId: string) {
    return this.prisma.checklistResponse.findMany({
      where: { checklistId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get checklist statistics
   */
  async getChecklistStats(siteId?: string) {
    const where = siteId ? { siteId } : {};

    const total = await this.prisma.checklist.count({ where });
    const pending = await this.prisma.checklist.count({
      where: { ...where, status: 'PENDING' },
    });
    const inProgress = await this.prisma.checklist.count({
      where: { ...where, status: 'IN_PROGRESS' },
    });
    const completed = await this.prisma.checklist.count({
      where: { ...where, status: 'COMPLETED' },
    });
    const verified = await this.prisma.checklist.count({
      where: { ...where, status: 'VERIFIED' },
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      verified,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }

  /**
   * Delete a checklist (only PENDING)
   */
  async deleteChecklist(id: string) {
    const checklist = await this.getChecklistById(id);

    if (checklist.status !== 'PENDING') {
      throw new BadRequestException('Can only delete pending checklists');
    }

    // Delete all responses first
    await this.prisma.checklistResponse.deleteMany({
      where: { checklistId: id },
    });

    return this.prisma.checklist.delete({
      where: { id },
    });
  }
}
