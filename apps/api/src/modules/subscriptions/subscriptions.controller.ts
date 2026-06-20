import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscribeSiteDto, ProcessSubscriptionPaymentDto } from './dto';

@Controller('subscriptions')
@UseGuards(JwtGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * Create subscription plan (Admin only)
   */
  @Post('plans')
  async createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  /**
   * Get all subscription plans
   */
  @Get('plans')
  async getAllPlans() {
    return this.subscriptionsService.getAllPlans();
  }

  /**
   * Get active subscription plans only
   */
  @Get('plans/active')
  async getActivePlans() {
    return this.subscriptionsService.getAllPlans(true);
  }

  /**
   * Get a specific plan
   */
  @Get('plans/:planId')
  async getPlan(@Param('planId') planId: string) {
    return this.subscriptionsService.getPlan(planId);
  }

  /**
   * Update subscription plan (Admin only)
   */
  @Put('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdateSubscriptionPlanDto
  ) {
    return this.subscriptionsService.updatePlan(planId, dto);
  }

  /**
   * Subscribe a site to a plan
   */
  @Post('subscribe')
  async subscribeSite(@Body() dto: SubscribeSiteDto) {
    return this.subscriptionsService.subscribeSite(dto);
  }

  /**
   * Get subscription for a site
   */
  @Get('site/:siteId')
  async getSiteSubscription(@Param('siteId') siteId: string) {
    return this.subscriptionsService.getSiteSubscription(siteId);
  }

  /**
   * Get all subscriptions
   */
  @Get()
  async getAllSubscriptions() {
    return this.subscriptionsService.getAllSubscriptions();
  }

  /**
   * Get subscriptions by status
   */
  @Get('status/:status')
  async getSubscriptionsByStatus(
    @Param('status') status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_RENEWAL'
  ) {
    return this.subscriptionsService.getSubscriptionsByStatus(status);
  }

  /**
   * Process subscription payment
   */
  @Post(':subscriptionId/payment')
  async processPayment(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ProcessSubscriptionPaymentDto
  ) {
    return this.subscriptionsService.processPayment({
      ...dto,
      subscriptionId,
    });
  }

  /**
   * Get subscription payments
   */
  @Get(':subscriptionId/payments')
  async getPayments(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionsService.getSubscriptionPayments(subscriptionId);
  }

  /**
   * Cancel subscription
   */
  @Post(':subscriptionId/cancel')
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body?: { reason?: string }
  ) {
    return this.subscriptionsService.cancelSubscription(subscriptionId, body?.reason);
  }

  /**
   * Renew subscription
   */
  @Post(':subscriptionId/renew')
  async renewSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.subscriptionsService.renewSubscription(subscriptionId);
  }

  /**
   * Get subscription statistics
   */
  @Get('stats/overview')
  async getStats() {
    return this.subscriptionsService.getSubscriptionStats();
  }
}
