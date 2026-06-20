import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  category?: 'COMPLIANCE' | 'SAFETY' | 'PERFORMANCE' | 'CONDUCT';

  @IsOptional()
  @IsNumber()
  complianceScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  safetyScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  performanceScore?: number; // 0-100

  @IsOptional()
  @IsNumber()
  conductScore?: number; // 0-100
}

export class AnomalyReportDto {
  @IsOptional()
  @IsString()
  type?: 'ABSENCE' | 'PERFORMANCE_DROP' | 'MULTIPLE_WARNINGS' | 'AUDIT_FAILURES' | 'PATTERN_CHANGE';

  @IsOptional()
  @IsNumber()
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsNumber()
  limit?: number;
}
