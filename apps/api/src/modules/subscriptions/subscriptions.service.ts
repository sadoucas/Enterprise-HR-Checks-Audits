import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscribeSiteDto, ProcessSubscriptionPaymentDto } from './dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a subscription plan (Admin only)
   */
  async createPlan(dto: CreateSubscriptionPlanDto) {
    if (dto.pricePerSite < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        pricePerSite: dto.pricePerSite,
        billingCycleDays: dto.billingCycleDays || 30,
        features: dto.features || [],
        maxAudits: dto.maxAudits || null,
        maxUsers: dto.maxUsers || null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Get all subscription plans
   */
  async getAllPlans(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    
    return this.prisma.subscriptionPlan.findMany({
      where,
      include: {
        subscriptions: {
          select: {
            id: true,
            siteId: true,
            status: true,
          },
        },
      },
      orderBy: { pricePerSite: 'asc' },
    });
  }

  /**
   * Get a specific plan
   */
  async getPlan(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        subscriptions: {
          select: {
            id: true,
            siteId: true,
            status: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Update subscription plan pricing and features (Admin only)
   */
  async updatePlan(planId: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (dto.pricePerSite !== undefined && dto.pricePerSite < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    return this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        description: dto.description,
        pricePerSite: dto.pricePerSite,
        features: dto.features,
        maxAudits: dto.maxAudits,
        maxUsers: dto.maxUsers,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Subscribe a site to a plan
   */
  async subscribeSite(dto: SubscribeSiteDto) {
    // Verify site exists
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Verify plan exists and is active
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found or is inactive');
    }

    // Check if site already has active subscription
    const existingSubscription = await this.prisma.siteSubscription.findFirst({
      where: {
        siteId: dto.siteId,
        status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Site already has an active subscription');
    }

    // Create subscription
    const subscription = await this.prisma.siteSubscription.create({
      data: {
        siteId: dto.siteId,
        planId: dto.planId,
        status: 'ACTIVE',
        startDate: new Date(),
        renewalDate: new Date(Date.now() + plan.billingCycleDays * 24 * 60 * 60 * 1000),
        amountPerCycle: plan.pricePerSite,
        paymentMethodId: dto.paymentMethodId,
      },
      include: {
        site: true,
        plan: true,
      },
    });

    return subscription;
  }

  /**
   * Get subscription for a site
   */
  async getSiteSubscription(siteId: string) {
    const subscription = await this.prisma.siteSubscription.findFirst({
      where: { siteId },
      include: {
        site: true,
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions() {
    return this.prisma.siteSubscription.findMany({
      include: {
        site: true,
        plan: true,
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get subscriptions by status
   */
  async getSubscriptionsByStatus(status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_RENEWAL') {
    return this.prisma.siteSubscription.findMany({
      where: { status },
      include: {
        site: true,
        plan: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Process subscription payment
   */
  async processPayment(dto: ProcessSubscriptionPaymentDto) {
    const subscription = await this.prisma.siteSubscription.findUnique({
      where: { id: dto.subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Cannot process payment for cancelled subscription');
    }

    // Validate amount matches subscription
    if (Math.abs(dto.amount - subscription.amountPerCycle) > 0.01) {
      throw new BadRequestException('Payment amount does not match subscription amount');
    }

    // Create payment record
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: dto.subscriptionId,
        amount: dto.amount,
        status: 'COMPLETED',
        paymentMethodId: dto.paymentMethodId,
        notes: dto.notes,
        processedAt: new Date(),
      },
    });

    // Update subscription renewal date
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
    });

    if (plan) {
      await this.prisma.siteSubscription.update({
        where: { id: subscription.id },
        data: {
          renewalDate: new Date(Date.now() + plan.billingCycleDays * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      });
    }

    return payment;
  }

  /**
   * Get subscription payments
   */
  async getSubscriptionPayments(subscriptionId: string) {
    return this.prisma.subscriptionPayment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    const subscription = await this.prisma.siteSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.siteSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        site: true,
        plan: true,
      },
    });
  }

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId: string) {
    const subscription = await this.prisma.siteSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Cannot renew cancelled subscription');
    }

    const newRenewalDate = new Date(
      subscription.renewalDate.getTime() + subscription.plan.billingCycleDays * 24 * 60 * 60 * 1000
    );

    return this.prisma.siteSubscription.update({
      where: { id: subscriptionId },
      data: {
        renewalDate: newRenewalDate,
        status: 'ACTIVE',
      },
      include: {
        site: true,
        plan: true,
      },
    });
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const total = await this.prisma.siteSubscription.count();
    const active = await this.prisma.siteSubscription.count({
      where: { status: 'ACTIVE' },
    });
    const cancelled = await this.prisma.siteSubscription.count({
      where: { status: 'CANCELLED' },
    });
    const expired = await this.prisma.siteSubscription.count({
      where: { status: 'EXPIRED' },
    });
    const pendingRenewal = await this.prisma.siteSubscription.count({
      where: { status: 'PENDING_RENEWAL' },
    });

    // Calculate total revenue
    const payments = await this.prisma.subscriptionPayment.findMany({
      where: { status: 'COMPLETED' },
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get revenue by plan
    const plans = await this.prisma.subscriptionPlan.findMany({
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { payments: { where: { status: 'COMPLETED' } } },
        },
      },
    });

    const revenueByPlan = plans.map(plan => ({
      planName: plan.name,
      activeSubscriptions: plan.subscriptions.length,
      monthlyRevenue: plan.pricePerSite * plan.subscriptions.length,
    }));

    return {
      total,
      active,
      cancelled,
      expired,
      pendingRenewal,
      totalRevenue,
      averageSubscriptionValue: total > 0 ? totalRevenue / total : 0,
      revenueByPlan,
    };
  }

  /**
   * Check expired subscriptions and mark them (should run as a cron job)
   */
  async checkExpiredSubscriptions() {
    const expiredSubscriptions = await this.prisma.siteSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
        renewalDate: {
          lt: new Date(),
        },
      },
    });

    for (const sub of expiredSubscriptions) {
      await this.prisma.siteSubscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
    }

    return expiredSubscriptions;
  }
}
