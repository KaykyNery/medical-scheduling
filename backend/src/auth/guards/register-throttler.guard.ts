import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

const ipRequests = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RegisterThrottlerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const limit = 5; // Máximo de 5 requisições por minuto

    const clientData = ipRequests.get(ip);

    if (!clientData || now > clientData.resetTime) {
      // Iniciar nova janela de rate limiting
      ipRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (clientData.count >= limit) {
      throw new HttpException(
        'Muitas requisições de registro. Por favor, tente novamente após 1 minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    clientData.count++;
    return true;
  }
}
