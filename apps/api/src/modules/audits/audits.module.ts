import { Module } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule {}
