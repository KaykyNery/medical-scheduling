import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { RegisterThrottlerGuard } from './guards/register-throttler.guard';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';

@Module({
  imports: [UsersModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RegisterThrottlerGuard,
    LoginThrottlerGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
