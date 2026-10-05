import { UserRole } from '../enums/user-role.enum';

export interface LoginDto {
  email: string;
  password?: string;
  phone?: string;
  role?: UserRole;
  tenantId?: string;
}

export interface RegisterPartnerDto {
  businessName: string;
  taxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  password?: string;
  city: string;
  services: string[];
  address?: string;
  businessLicenseUrl?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  isSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}
