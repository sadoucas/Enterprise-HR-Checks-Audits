import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FormsModule } from './modules/forms/forms.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { AuditsModule } from './modules/audits/audits.module';
import { WarningsModule } from './modules/warnings/warnings.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FormsModule,
    ChecklistsModule,
    AuditsModule,
    WarningsModule,
    MessagingModule,
    AnalyticsModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
