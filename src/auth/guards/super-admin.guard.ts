import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums/role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Access denied. Only SUPER_ADMIN can have access to this functionality.',
      );
    }

    return true;
  }
}
