import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRiskAssessmentDto, AnomalyReportDto } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate overall risk score for a user
   * Based on: compliance, safety, performance, conduct
   */
  async calculateUserRiskScore(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user data
    const [warnings, audits, forms, checklists] = await Promise.all([
      this.prisma.warning.findMany({ where: { receivedById: userId } }),
      this.prisma.audit.findMany({
        where: { conductedBy: { id: userId } },
      }),
      this.prisma.form.findMany({
        where: { submittedBy: { id: userId } },
      }),
      this.prisma.checklist.findMany({
        where: { completedBy: { id: userId } },
      }),
    ]);

    // Calculate component scores
    const complianceScore = this.calculateComplianceScore(warnings, forms, audits);
    const safetyScore = this.calculateSafetyScore(checklists, audits);
    const performanceScore = this.calculatePerformanceScore(forms, checklists);
    const conductScore = this.calculateConductScore(warnings);

    // Calculate overall risk score (0-100, higher = more risk)
    const overallRiskScore = Math.round(
      (100 - complianceScore + 100 - safetyScore + 100 - performanceScore + 100 - conductScore) / 4
    );

    // Determine risk level
    const riskLevel = this.getRiskLevel(overallRiskScore);

    return {
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      overallRiskScore,
      riskLevel,
      componentScores: {
        compliance: complianceScore,
        safety: safetyScore,
        performance: performanceScore,
        conduct: conductScore,
      },
      metrics: {
        totalWarnings: warnings.length,
        criticalWarnings: warnings.filter(w => w.type === 'TERMINATION').length,
        completedAudits: audits.filter(a => a.status === 'COMPLETED').length,
        submittedForms: forms.filter(f => f.status === 'SUBMITTED').length,
        completedChecklists: checklists.filter(c => c.status === 'COMPLETED').length,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get compliance score (0-100, higher = better)
   */
  private calculateComplianceScore(
    warnings: any[],
    forms: any[],
    audits: any[]
  ): number {
    let score = 100;

    // Deduct points for warnings
    const criticalWarnings = warnings.filter(w => w.type === 'TERMINATION' || w.type === 'SUSPENSION').length;
    const severeWarnings = warnings.filter(w => w.type === 'WRITTEN').length;

    score -= criticalWarnings * 25;
    score -= severeWarnings * 10;

    // Deduct points for rejected forms
    const rejectedForms = forms.filter(f => f.status === 'REJECTED').length;
    score -= rejectedForms * 5;

    // Add points for completed audits
    const completedAudits = audits.filter(a => a.status === 'REPORTED').length;
    score += Math.min(completedAudits * 2, 20);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get safety score (0-100, higher = better)
   */
  private calculateSafetyScore(checklists: any[], audits: any[]): number {
    let score = 100;

    // Deduct for pending checklists
    const pendingChecklists = checklists.filter(c => c.status === 'PENDING').length;
    score -= pendingChecklists * 5;

    // Deduct for incomplete audits
    const incompleteAudits = audits.filter(
      a => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS'
    ).length;
    score -= incompleteAudits * 8;

    // Add points for verified checklists
    const verifiedChecklists = checklists.filter(c => c.status === 'VERIFIED').length;
    score += Math.min(verifiedChecklists * 1, 15);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance score (0-100, higher = better)
   */
  private calculatePerformanceScore(forms: any[], checklists: any[]): number {
    let score = 100;

    if (forms.length === 0 && checklists.length === 0) {
      return 50; // Neutral if no data
    }

    // Calculate form submission rate
    const submittedForms = forms.filter(f => f.status === 'SUBMITTED' || f.status === 'APPROVED').length;
    const formCompletionRate = forms.length > 0 ? (submittedForms / forms.length) * 100 : 50;

    // Calculate checklist completion rate
    const completedChecklists = checklists.filter(
      c => c.status === 'COMPLETED' || c.status === 'VERIFIED'
    ).length;
    const checklistCompletionRate =
      checklists.length > 0 ? (completedChecklists / checklists.length) * 100 : 50;

    // Average performance
    score = (formCompletionRate + checklistCompletionRate) / 2;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get conduct score (0-100, higher = better)
   */
  private calculateConductScore(warnings: any[]): number {
    let score = 100;

    // Deduct for each warning
    score -= warnings.length * 5;

    // Extra deduction for unresolved warnings
    const unresolvedWarnings = warnings.filter(w => w.status !== 'RESOLVED').length;
    score -= unresolvedWarnings * 10;

    // Extra penalty for multiple warnings in short time
    const recentWarnings = warnings.filter(
      w => new Date().getTime() - new Date(w.issuedAt).getTime() < 30 * 24 * 60 * 60 * 1000 // 30 days
    ).length;

    if (recentWarnings > 2) {
      score -= (recentWarnings - 2) * 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level based on score
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Detect anomalies in user data
   */
  async detectAnomalies(userId?: string, filter?: AnomalyReportDto) {
    const anomalies = [];

    // Get all users if userId not specified
    const users = userId
      ? [await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })]
      : await this.prisma.user.findMany({ where: { isActive: true } });

    for (const user of users) {
      const userAnomalies = await this.detectUserAnomalies(user.id);
      anomalies.push(...userAnomalies);
    }

    // Filter by severity if specified
    if (filter?.severity) {
      return anomalies.filter(a => a.severity === filter.severity);
    }

    // Filter by type if specified
    if (filter?.type) {
      return anomalies.filter(a => a.type === filter.type);
    }

    return anomalies.slice(0, filter?.limit || 100);
  }

  /**
   * Detect anomalies for a specific user
   */
  private async detectUserAnomalies(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return [];

    const anomalies: any[] = [];

    // Get user data
    const [warnings, forms, checklists, messages] = await Promise.all([
      this.prisma.warning.findMany({ where: { receivedById: userId } }),
      this.prisma.form.findMany({ where: { submittedBy: { id: userId } } }),
      this.prisma.checklist.findMany({ where: { completedBy: { id: userId } } }),
      this.prisma.message.findMany({ where: { senderId: userId } }),
    ]);

    // 1. Detect high absence rate (no form/checklist completion in 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = forms.filter(f => new Date(f.submittedAt) > sevenDaysAgo).length +
      checklists.filter(c => new Date(c.completedAt) > sevenDaysAgo).length;

    if (recentActivity === 0 && (forms.length > 0 || checklists.length > 0)) {
      anomalies.push({
        type: 'ABSENCE',
        severity: 'HIGH',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        description: 'No activity in the last 7 days',
        timestamp: new Date(),
      });
    }

    // 2. Detect performance drop
    if (forms.length >= 5) {
      const recentForms = forms.slice(-5);
      const rejectedCount = recentForms.filter(f => f.status === 'REJECTED').length;
      if (rejectedCount >= 3) {
        anomalies.push({
          type: 'PERFORMANCE_DROP',
          severity: 'HIGH',
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          description: `${rejectedCount} out of 5 recent forms rejected`,
          timestamp: new Date(),
        });
      }
    }

    // 3. Detect multiple warnings in short time
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentWarnings = warnings.filter(w => new Date(w.issuedAt) > thirtyDaysAgo);

    if (recentWarnings.length >= 3) {
      anomalies.push({
        type: 'MULTIPLE_WARNINGS',
        severity: recentWarnings.length >= 4 ? 'CRITICAL' : 'HIGH',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        description: `${recentWarnings.length} warnings issued in the last 30 days`,
        warnings: recentWarnings.map(w => ({ type: w.type, date: w.issuedAt })),
        timestamp: new Date(),
      });
    }

    // 4. Detect unresolved warnings
    const unresolvedWarnings = warnings.filter(w => w.status !== 'RESOLVED');
    if (unresolvedWarnings.length >= 2) {
      anomalies.push({
        type: 'PATTERN_CHANGE',
        severity: 'MEDIUM',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        description: `${unresolvedWarnings.length} unresolved warnings`,
        timestamp: new Date(),
      });
    }

    // 5. Detect sudden communication increase (spam/abuse potential)
    const messagesLastDay = messages.filter(
      m => new Date().getTime() - new Date(m.createdAt).getTime() < 24 * 60 * 60 * 1000
    ).length;

    if (messagesLastDay > 50) {
      anomalies.push({
        type: 'PATTERN_CHANGE',
        severity: 'MEDIUM',
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        description: `Unusual message volume: ${messagesLastDay} messages in last 24 hours`,
        timestamp: new Date(),
      });
    }

    return anomalies;
  }

  /**
   * Get risk assessment for all users (organization overview)
   */
  async getOrganizationRiskOverview() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const assessments = await Promise.all(
      users.map(user => this.calculateUserRiskScore(user.id))
    );

    // Calculate organization statistics
    const riskDistribution = {
      LOW: assessments.filter(a => a.riskLevel === 'LOW').length,
      MEDIUM: assessments.filter(a => a.riskLevel === 'MEDIUM').length,
      HIGH: assessments.filter(a => a.riskLevel === 'HIGH').length,
      CRITICAL: assessments.filter(a => a.riskLevel === 'CRITICAL').length,
    };

    const averageRiskScore = Math.round(
      assessments.reduce((sum, a) => sum + a.overallRiskScore, 0) / assessments.length
    );

    const topRisks = assessments
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore)
      .slice(0, 10);

    return {
      totalUsers: assessments.length,
      riskDistribution,
      averageRiskScore,
      organizationRiskLevel: this.getRiskLevel(averageRiskScore),
      topRisks,
      timestamp: new Date(),
    };
  }

  /**
   * Get predictive recommendations
   */
  async getPredictiveRecommendations(userId: string) {
    const assessment = await this.calculateUserRiskScore(userId);
    const anomalies = await this.detectUserAnomalies(userId);
    const recommendations: string[] = [];

    // Based on risk scores
    if (assessment.componentScores.compliance < 60) {
      recommendations.push('Review compliance training and increase form submission frequency');
    }

    if (assessment.componentScores.safety < 60) {
      recommendations.push('Schedule safety audit and verify checklist completion');
    }

    if (assessment.componentScores.performance < 60) {
      recommendations.push('Conduct performance review meeting and set improvement targets');
    }

    if (assessment.componentScores.conduct < 60) {
      recommendations.push('Schedule disciplinary meeting and discuss behavioral expectations');
    }

    // Based on anomalies
    if (anomalies.some(a => a.type === 'ABSENCE')) {
      recommendations.push('Investigate reason for inactivity and provide support if needed');
    }

    if (anomalies.some(a => a.type === 'PERFORMANCE_DROP')) {
      recommendations.push('Provide additional training or resources to improve performance');
    }

    if (anomalies.some(a => a.type === 'MULTIPLE_WARNINGS')) {
      recommendations.push('Consider escalation to HR for formal disciplinary action');
    }

    return {
      userId,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue current performance monitoring'],
      riskLevel: assessment.riskLevel,
      timestamp: new Date(),
    };
  }
}
