import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

const loginIpRequests = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class LoginThrottlerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        ?.split(',')[0]
        .trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const limit = 10; // Máximo de 10 tentativas de login por minuto por IP

    const clientData = loginIpRequests.get(ip);

    if (!clientData || now > clientData.resetTime) {
      loginIpRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (clientData.count >= limit) {
      throw new HttpException(
        'Muitas tentativas de login. Por favor, aguarde 1 minuto antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    clientData.count++;
    return true;
  }
}
