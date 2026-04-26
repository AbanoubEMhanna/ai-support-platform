import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OrgGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return Boolean(req.user?.orgId);
  }
}

