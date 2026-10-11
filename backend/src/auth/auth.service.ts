import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (
      process.env.NODE_ENV === 'production' &&
      (!secret || secret === 'seu_secret_aqui')
    ) {
      throw new Error('JWT_SECRET must be securely configured in production');
    }
    return secret || 'seu_secret_aqui';
  }

  private getJwtRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (
      process.env.NODE_ENV === 'production' &&
      (!secret || secret === 'seu_refresh_secret_aqui')
    ) {
      throw new Error(
        'JWT_REFRESH_SECRET must be securely configured in production',
      );
    }
    return secret || 'seu_refresh_secret_aqui';
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getJwtRefreshSecret(),
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.getJwtRefreshSecret(),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      const { passwordHash, ...userWithoutPassword } = user;

      const newPayload = { sub: user.id, email: user.email, role: user.role };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: this.getJwtSecret(),
        expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.getJwtRefreshSecret(),
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: userWithoutPassword,
      };
    } catch (e) {
      throw new UnauthorizedException(
        'Token de atualização inválido ou expirado',
      );
    }
  }
}
