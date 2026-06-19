import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAuditDto, CompleteAuditDto } from './dto';
import { AuditStatus } from '@compliance/shared';

@Injectable()
export class AuditsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new audit
   */
  async createAudit(dto: CreateAuditDto) {
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const conductor = await this.prisma.user.findUnique({
      where: { id: dto.conductedById },
    });

    if (!conductor) {
      throw new NotFoundException('Conductor not found');
    }

    return this.prisma.audit.create({
      data: {
        title: dto.title,
        description: dto.description,
        siteId: dto.siteId,
        conductedById: dto.conductedById,
        scheduledDate: new Date(dto.scheduledDate),
        status: 'SCHEDULED',
        requiredFields: dto.requiredFields || [],
        signatureRequired: dto.signatureRequired || false,
        auditData: JSON.stringify({}),
      },
    });
  }

  /**
   * Get all audits for a site
   */
  async getAuditsBySite(siteId: string) {
    return this.prisma.audit.findMany({
      where: { siteId },
      include: {
        site: true,
        conductedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  /**
   * Get a single audit by ID
   */
  async getAuditById(id: string) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        site: true,
        conductedBy: {
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

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    return audit;
  }

  /**
   * Get scheduled audits (not yet started)
   */
  async getScheduledAudits(siteId?: string) {
    const where = siteId ? { siteId, status: 'SCHEDULED' } : { status: 'SCHEDULED' };

    return this.prisma.audit.findMany({
      where,
      include: {
        site: true,
        conductedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  /**
   * Get in-progress audits
   */
  async getInProgressAudits(siteId?: string) {
    const where = siteId ? { siteId, status: 'IN_PROGRESS' } : { status: 'IN_PROGRESS' };

    return this.prisma.audit.findMany({
      where,
      include: {
        site: true,
        conductedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  /**
   * Get completed audits
   */
  async getCompletedAudits(siteId?: string) {
    const where = siteId ? { siteId, status: 'COMPLETED' } : { status: 'COMPLETED' };

    return this.prisma.audit.findMany({
      where,
      include: {
        site: true,
        conductedBy: {
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
   * Start an audit (SCHEDULED -> IN_PROGRESS)
   */
  async startAudit(auditId: string) {
    const audit = await this.getAuditById(auditId);

    if (audit.status !== 'SCHEDULED') {
      throw new BadRequestException('Can only start scheduled audits');
    }

    return this.prisma.audit.update({
      where: { id: auditId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  /**
   * Complete an audit with findings
   */
  async completeAudit(auditId: string, dto: CompleteAuditDto) {
    const audit = await this.getAuditById(auditId);

    if (audit.status === 'REPORTED') {
      throw new BadRequestException('Audit is already reported');
    }

    // Validate required fields
    const requiredFields = audit.requiredFields as string[];
    const missingFields = requiredFields.filter(field => !dto.findings[field]);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate signature if required
    if (audit.signatureRequired && !dto.signature) {
      throw new BadRequestException('Signature is required for this audit');
    }

    // Get conductor
    const conductor = await this.prisma.user.findUnique({
      where: { id: dto.conductedById },
    });

    if (!conductor) {
      throw new NotFoundException('Conductor not found');
    }

    // Parse findings and calculate severity distribution
    const findingsArray = Array.isArray(dto.findings) ? dto.findings : Object.values(dto.findings);
    const severityCount = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    findingsArray.forEach((finding: any) => {
      if (finding.severity && severityCount.hasOwnProperty(finding.severity)) {
        severityCount[finding.severity]++;
      }
    });

    // Update audit
    const updatedAudit = await this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        auditData: JSON.stringify(dto.findings),
        signatureData: dto.signature ? JSON.stringify(dto.signature) : null,
        findingsSummary: JSON.stringify(severityCount),
      },
    });

    // Create response record
    await this.prisma.auditResponse.create({
      data: {
        auditId,
        responseData: JSON.stringify({
          conductedBy: conductor.email,
          completedAt: new Date(),
          findings: dto.findings,
          severitySummary: severityCount,
          signature: dto.signature ? 'present' : 'none',
        }),
      },
    });

    return updatedAudit;
  }

  /**
   * Report an audit (COMPLETED -> REPORTED)
   */
  async reportAudit(auditId: string, reportData: any) {
    const audit = await this.getAuditById(auditId);

    if (audit.status !== 'COMPLETED') {
      throw new BadRequestException('Can only report completed audits');
    }

    return this.prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'REPORTED',
        reportedAt: new Date(),
        reportData: JSON.stringify(reportData),
      },
    });
  }

  /**
   * Get audit findings
   */
  async getAuditFindings(auditId: string) {
    const audit = await this.getAuditById(auditId);

    if (!audit.auditData) {
      return null;
    }

    return JSON.parse(audit.auditData);
  }

  /**
   * Get audit responses
   */
  async getAuditResponses(auditId: string) {
    return this.prisma.auditResponse.findMany({
      where: { auditId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(siteId?: string) {
    const where = siteId ? { siteId } : {};

    const total = await this.prisma.audit.count({ where });
    const scheduled = await this.prisma.audit.count({
      where: { ...where, status: 'SCHEDULED' },
    });
    const inProgress = await this.prisma.audit.count({
      where: { ...where, status: 'IN_PROGRESS' },
    });
    const completed = await this.prisma.audit.count({
      where: { ...where, status: 'COMPLETED' },
    });
    const reported = await this.prisma.audit.count({
      where: { ...where, status: 'REPORTED' },
    });

    // Get critical findings count
    const auditsWithFindings = await this.prisma.audit.findMany({
      where: { ...where, status: { in: ['COMPLETED', 'REPORTED'] } },
      select: { findingsSummary: true },
    });

    let criticalCount = 0;
    auditsWithFindings.forEach(audit => {
      if (audit.findingsSummary) {
        const summary = JSON.parse(audit.findingsSummary);
        criticalCount += summary.CRITICAL || 0;
      }
    });

    return {
      total,
      scheduled,
      inProgress,
      completed,
      reported,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      reportingRate: total > 0 ? Math.round((reported / total) * 100) : 0,
      criticalFindingsCount: criticalCount,
    };
  }

  /**
   * Delete an audit (only SCHEDULED)
   */
  async deleteAudit(id: string) {
    const audit = await this.getAuditById(id);

    if (audit.status !== 'SCHEDULED') {
      throw new BadRequestException('Can only delete scheduled audits');
    }

    // Delete all responses first
    await this.prisma.auditResponse.deleteMany({
      where: { auditId: id },
    });

    return this.prisma.audit.delete({
      where: { id },
    });
  }
}
