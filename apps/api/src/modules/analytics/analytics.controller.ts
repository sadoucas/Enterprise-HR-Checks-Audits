import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateRiskAssessmentDto, AnomalyReportDto } from './dto';

@Controller('analytics')
@UseGuards(JwtGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Calculate user risk score
   */
  @Get('risk/:userId')
  async getUserRiskScore(@Param('userId') userId: string) {
    return this.analyticsService.calculateUserRiskScore(userId);
  }

  /**
   * Get organization risk overview
   */
  @Get('organization/overview')
  async getOrganizationOverview() {
    return this.analyticsService.getOrganizationRiskOverview();
  }

  /**
   * Detect anomalies
   */
  @Get('anomalies')
  async detectAnomalies(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string
  ) {
    const filter = {
      type: type as any,
      severity: severity as any,
      limit: limit ? parseInt(limit) : undefined,
    };
    return this.analyticsService.detectAnomalies(userId, filter);
  }

  /**
   * Detect user anomalies
   */
  @Get('anomalies/:userId')
  async getUserAnomalies(@Param('userId') userId: string) {
    return this.analyticsService.detectAnomalies(userId);
  }

  /**
   * Get predictive recommendations
   */
  @Get('recommendations/:userId')
  async getRecommendations(@Param('userId') userId: string) {
    return this.analyticsService.getPredictiveRecommendations(userId);
  }
}
