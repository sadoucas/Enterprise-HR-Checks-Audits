import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IssueWarningDto, AcknowledgeWarningDto, AppealWarningDto, ResolveWarningDto } from './dto';
import { UserRole, WarningStatus } from '@compliance/shared';

@Injectable()
export class WarningsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Issue a warning
   * Flows: Admin→Employee, Admin→Manager, Manager→Employee, Admin→Admin
   */
  async issueWarning(dto: IssueWarningDto) {
    // Get issuer
    const issuer = await this.prisma.user.findUnique({
      where: { id: dto.issuedById },
    });

    if (!issuer) {
      throw new NotFoundException('Issuer not found');
    }

    // Get receiver
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receivedById },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    // Validate warning flow
    this.validateWarningFlow(issuer.role, receiver.role);

    // Create warning
    return this.prisma.warning.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: 'ISSUED',
        issuedById: dto.issuedById,
        receivedById: dto.receivedById,
        issuedAt: new Date(),
        acknowledgmentRequired: dto.acknowledgmentRequired ?? true,
        signatureRequired: dto.signatureRequired ?? false,
      },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Validate warning issuance flow
   */
  private validateWarningFlow(issuerRole: UserRole, receiverRole: UserRole) {
    const validFlows: Record<UserRole, UserRole[]> = {
      ADMIN: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
      MANAGER: ['EMPLOYEE'],
      EMPLOYEE: [],
    };

    if (!validFlows[issuerRole]?.includes(receiverRole)) {
      throw new ForbiddenException(
        `${issuerRole} cannot issue warnings to ${receiverRole}`
      );
    }
  }

  /**
   * Get all warnings issued by a user
   */
  async getWarningsIssuedBy(userId: string) {
    return this.prisma.warning.findMany({
      where: { issuedById: userId },
      include: {
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Get all warnings received by a user
   */
  async getWarningsReceivedBy(userId: string) {
    return this.prisma.warning.findMany({
      where: { receivedById: userId },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Get a single warning by ID
   */
  async getWarningById(id: string) {
    const warning = await this.prisma.warning.findUnique({
      where: { id },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!warning) {
      throw new NotFoundException('Warning not found');
    }

    return warning;
  }

  /**
   * Acknowledge a warning (move to ACKNOWLEDGED status)
   */
  async acknowledgeWarning(warningId: string, dto: AcknowledgeWarningDto) {
    const warning = await this.getWarningById(warningId);

    if (warning.status !== 'ISSUED') {
      throw new BadRequestException('Can only acknowledge warnings in ISSUED status');
    }

    if (!warning.acknowledgmentRequired) {
      throw new BadRequestException('This warning does not require acknowledgment');
    }

    // Validate signature if required
    if (warning.signatureRequired && !dto.signature) {
      throw new BadRequestException('Signature is required to acknowledge this warning');
    }

    return this.prisma.warning.update({
      where: { id: warningId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        signatureData: dto.signature ? JSON.stringify(dto.signature) : null,
      },
      include: {
        issuedBy: true,
        receivedBy: true,
      },
    });
  }

  /**
   * Appeal a warning (move to APPEALED status)
   */
  async appealWarning(warningId: string, dto: AppealWarningDto) {
    const warning = await this.getWarningById(warningId);

    if (!['ISSUED', 'ACKNOWLEDGED'].includes(warning.status)) {
      throw new BadRequestException(
        'Can only appeal warnings in ISSUED or ACKNOWLEDGED status'
      );
    }

    return this.prisma.warning.update({
      where: { id: warningId },
      data: {
        status: 'APPEALED',
        appealReason: dto.reason,
        supportingNotes: dto.supportingNotes,
        appealedAt: new Date(),
      },
      include: {
        issuedBy: true,
        receivedBy: true,
      },
    });
  }

  /**
   * Resolve a warning (move to RESOLVED status)
   */
  async resolveWarning(warningId: string, dto: ResolveWarningDto) {
    const warning = await this.getWarningById(warningId);

    if (!['ISSUED', 'ACKNOWLEDGED', 'APPEALED'].includes(warning.status)) {
      throw new BadRequestException(
        'Can only resolve warnings in ISSUED, ACKNOWLEDGED, or APPEALED status'
      );
    }

    return this.prisma.warning.update({
      where: { id: warningId },
      data: {
        status: 'RESOLVED',
        resolutionNotes: dto.resolutionNotes,
        outcome: dto.outcome,
        resolvedAt: new Date(),
      },
      include: {
        issuedBy: true,
        receivedBy: true,
      },
    });
  }

  /**
   * Get pending warnings (not yet acknowledged)
   */
  async getPendingWarnings() {
    return this.prisma.warning.findMany({
      where: { status: 'ISSUED' },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Get appealed warnings (pending review)
   */
  async getAppealedWarnings() {
    return this.prisma.warning.findMany({
      where: { status: 'APPEALED' },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { appealedAt: 'desc' },
    });
  }

  /**
   * Get warning statistics
   */
  async getWarningStats() {
    const total = await this.prisma.warning.count();
    const issued = await this.prisma.warning.count({
      where: { status: 'ISSUED' },
    });
    const acknowledged = await this.prisma.warning.count({
      where: { status: 'ACKNOWLEDGED' },
    });
    const appealed = await this.prisma.warning.count({
      where: { status: 'APPEALED' },
    });
    const resolved = await this.prisma.warning.count({
      where: { status: 'RESOLVED' },
    });

    // Count by type
    const byType = {
      VERBAL: await this.prisma.warning.count({ where: { type: 'VERBAL' } }),
      WRITTEN: await this.prisma.warning.count({ where: { type: 'WRITTEN' } }),
      SUSPENSION: await this.prisma.warning.count({ where: { type: 'SUSPENSION' } }),
      TERMINATION: await this.prisma.warning.count({ where: { type: 'TERMINATION' } }),
    };

    return {
      total,
      byStatus: {
        issued,
        acknowledged,
        appealed,
        resolved,
      },
      byType,
      acknowledgmentRate: total > 0 ? Math.round(((acknowledged + appealed + resolved) / total) * 100) : 0,
      appealRate: total > 0 ? Math.round((appealed / total) * 100) : 0,
    };
  }

  /**
   * Get warning history for a user
   */
  async getUserWarningHistory(userId: string) {
    const warnings = await this.prisma.warning.findMany({
      where: {
        OR: [
          { issuedById: userId },
          { receivedById: userId },
        ],
      },
      include: {
        issuedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return warnings;
  }
}
