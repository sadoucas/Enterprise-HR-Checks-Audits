import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  pricePerSite: number; // Price charged per site

  @IsOptional()
  @IsNumber()
  billingCycleDays?: number; // Default: 30 days

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  maxAudits?: number;

  @IsOptional()
  maxUsers?: number;

  @IsOptional()
  isActive?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  pricePerSite?: number;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsNumber()
  maxAudits?: number;

  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @IsOptional()
  isActive?: boolean;
}

export class SubscribeSiteDto {
  @IsString()
  siteId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

export class ProcessSubscriptionPaymentDto {
  @IsString()
  subscriptionId: string;

  @IsNumber()
  amount: number;

  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
