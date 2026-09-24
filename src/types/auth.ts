export type UserRole =
  | 'super_admin'
  | 'franchise_admin'
  | 'lab_staff'
  | 'doctor'
  | 'phlebotomist'
  | 'technician'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FRANCHISE'
  | 'LAB_DEPARTMENT'
  | 'EXECUTIVE'
  | 'PATHOLOGY_PARTNER'
  | 'PATHOLOGIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'inactive';
  franchiseId?: string;
  branchId?: string | null;
  branchName?: string | null;
  uhid?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  adminRole?: string | null;
  adminRoleSlug?: string | null;
  permissions?: string[];
  accessibleModules?: string[];
  familyMembers?: {
    id: string;
    name: string;
    relation: string;
    age: number;
    gender: string;
  }[];
}
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
