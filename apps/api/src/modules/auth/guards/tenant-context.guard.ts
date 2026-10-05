import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../jwt.strategy';
import { UserRole } from '@linkkwork/shared-types';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    const impersonateHeaderRaw = request.headers['x-impersonate-tenant-id'];
    const impersonateTenantId = Array.isArray(impersonateHeaderRaw)
      ? impersonateHeaderRaw[0]
      : impersonateHeaderRaw;

    if (impersonateTenantId) {
      const isSuperAdmin = user?.isSuperAdmin === true || user?.role === UserRole.SUPER_ADMIN;

      if (!isSuperAdmin) {
        throw new ForbiddenException('Non-super-admin users are not permitted to impersonate tenants');
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: impersonateTenantId },
      });

      if (!tenant) {
        throw new NotFoundException(`Impersonated tenant with ID ${impersonateTenantId} does not exist`);
      }

      request.tenantId = impersonateTenantId;
      request.isImpersonating = true;
      request.impersonatedTenant = tenant;
    } else {
      request.tenantId = user?.tenantId ?? null;
      request.isImpersonating = false;
    }

    return true;
  }
}
