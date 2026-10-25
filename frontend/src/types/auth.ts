export type UserDepartment =
  | 'ADMIN'
  | 'MANAGEMENT'
  | 'DESIGN'
  | 'PURCHASE'
  | 'QUALITY'
  | 'STORE'
  | 'PRODUCTION'
  | 'DISPATCH'
  | 'SERVICE'
  | 'SALES';

export interface Role {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  allowedRoutes: string[];
  isSystemRole?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role | string;
  department: UserDepartment;
  plantLocation?: string;
  refreshTokenExpiry?: string;
  isSuperAdmin?: boolean;
  isActive: boolean;
  status: 'ACTIVE' | 'DEACTIVATED';
  avatarUrl?: string;
  allowedRoutes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken?: string;
  user: User;
}
