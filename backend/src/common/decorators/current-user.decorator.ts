import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserClaims {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): CurrentUserClaims => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as CurrentUserClaims;
});
