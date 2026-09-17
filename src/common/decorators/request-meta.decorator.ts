import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces';

export interface RequestMetaDto {
  ip?: string;
  userAgent?: string;
}

export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMetaDto => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];

    return {
      ip: forwardedIp?.trim() || request.ip,
      userAgent: request.headers['user-agent'],
    };
  },
);
