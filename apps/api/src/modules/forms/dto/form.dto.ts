import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateFormDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  departmentId: string;

  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @IsOptional()
  signatureRequired?: boolean;
}

export class SubmitFormDto {
  @IsString()
  userId: string;

  formData: Record<string, any>;

  @IsOptional()
  signature?: any;
}

export class ApproveFormDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
