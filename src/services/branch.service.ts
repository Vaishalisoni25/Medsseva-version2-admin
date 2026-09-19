import api from './api';

export interface Branch {
  id: string;
  name: string;
  code: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  contactNumber?: string;
  email?: string;
  workingHours?: string;
  availableSlots?: string[];
  homeCollection: boolean;
  labVisit: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BranchFormData {
  name: string;
  code: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  contactNumber?: string;
  email?: string;
  workingHours?: string;
  availableSlots?: string[];
  homeCollection: boolean;
  labVisit: boolean;
  isActive: boolean;
}

export const branchService = {
  getAll: (): Promise<{ success: boolean; data: Branch[] }> =>
    api.get('/branches').then(r => r.data),

  getAdminLocations: (): Promise<{ success: boolean; data: any[] }> =>
    api.get('/branches/admin-locations').then(r => r.data),

  getById: (id: string): Promise<{ success: boolean; data: Branch }> =>
    api.get(`/branches/${id}`).then(r => r.data),

  create: (data: BranchFormData): Promise<{ success: boolean; data: Branch }> =>
    api.post('/branches', data).then(r => r.data),

  update: (id: string, data: Partial<BranchFormData>): Promise<{ success: boolean; data: Branch }> =>
    api.put(`/branches/${id}`, data).then(r => r.data),

  delete: (id: string): Promise<{ success: boolean }> =>
    api.delete(`/branches/${id}`).then(r => r.data),

  toggleStatus: (id: string, isActive: boolean): Promise<{ success: boolean; data: Branch }> =>
    api.patch(`/branches/${id}/status`, { isActive }).then(r => r.data),
};