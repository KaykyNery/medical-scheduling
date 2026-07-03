import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ProceduresModule } from './procedures/procedures.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProfessionalsModule,
    NotificationsModule,
    SchedulingModule,
    ProceduresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
