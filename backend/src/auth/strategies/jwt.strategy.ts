import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET || 'seu_secret_aqui';
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'seu_secret_aqui')
    ) {
      throw new Error('JWT_SECRET must be securely configured in production');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
