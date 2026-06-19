import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateAuditDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  siteId: string;

  @IsDateString()
  scheduledDate: string;

  @IsString()
  conductedById: string;

  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @IsOptional()
  signatureRequired?: boolean;
}

export class CompleteAuditDto {
  @IsString()
  conductedById: string;

  findings: Record<string, any>;

  @IsOptional()
  signature?: any;
}

export class AuditFinding {
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation?: string;
  status: 'OPEN' | 'RESOLVED';
}
