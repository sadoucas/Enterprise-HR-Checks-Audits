import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateChecklistDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  siteId: string;

  @IsArray()
  items: ChecklistItem[];

  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @IsOptional()
  signatureRequired?: boolean;
}

export class ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

export class CompleteChecklistDto {
  @IsString()
  userId: string;

  responses: Record<string, any>;

  @IsOptional()
  signature?: any;
}

export class VerifyChecklistDto {
  @IsString()
  verifiedById: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
