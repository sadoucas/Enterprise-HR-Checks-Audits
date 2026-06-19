import { IsString, IsOptional } from 'class-validator';

export class IssueWarningDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  type: 'VERBAL' | 'WRITTEN' | 'SUSPENSION' | 'TERMINATION';

  @IsString()
  issuedById: string;

  @IsString()
  receivedById: string;

  @IsOptional()
  acknowledgmentRequired?: boolean;

  @IsOptional()
  signatureRequired?: boolean;
}

export class AcknowledgeWarningDto {
  @IsOptional()
  signature?: any;
}

export class AppealWarningDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  supportingNotes?: string;
}

export class ResolveWarningDto {
  @IsString()
  resolutionNotes: string;

  @IsOptional()
  @IsString()
  outcome?: string;
}
