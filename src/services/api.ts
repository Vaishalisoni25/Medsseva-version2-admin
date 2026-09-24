import axios from 'axios';

export const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:5000/api'
  : (import.meta.env.VITE_API_URL || 'https://medsseva-backend-cnud.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const isDoctorPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/doctor-portal');
  const isPartnerPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/partner-portal');

  let token = null;
  if (isDoctorPortal) {
    token = localStorage.getItem('doctor_token') || localStorage.getItem('token');
  } else if (isPartnerPortal) {
    token = localStorage.getItem('partner_token') || localStorage.getItem('token');
  } else {
    token = localStorage.getItem('medsseva_token') || localStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const commissionService = {
  getAdminCommissions: (period?: string, branchId?: string, city?: string) =>
    api.get('/commissions/admin/all', { params: { period, branchId, city } }).then(r => r.data),
  updateConfig: (entityType: string, id: string, data: any) =>
    api.patch(`/commissions/admin/config/${entityType}/${id}`, data).then(r => r.data),
  updatePayoutStatus: (data: any) =>
    api.patch('/commissions/admin/payout-status', data).then(r => r.data),
  getDoctorPortalData: (period?: string, doctorId?: string) =>
    api.get('/commissions/doctor/portal-data', { params: { period, doctorId } }).then(r => r.data),
  getPartnerPortalData: (period?: string, partnerId?: string) =>
    api.get('/commissions/partner/portal-data', { params: { period, partnerId } }).then(r => r.data),
};

export const supportConfigService = {
  getSupportConfig: () => api.get('/support/config').then(r => r.data),
  updateSupportConfig: (data: any) => api.put('/support/config', data).then(r => r.data),
};

export const expenseService = {
  getExpenses: (params?: any) => api.get('/expenses', { params }).then(r => r.data),
  getExpenseSummary: () => api.get('/expenses/summary').then(r => r.data),
  getExpenseById: (id: string) => api.get(`/expenses/${id}`).then(r => r.data),
  createExpense: (data: any) => api.post('/expenses', data).then(r => r.data),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data).then(r => r.data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`).then(r => r.data),
  getCategories: () => api.get('/expenses/categories').then(r => r.data),
};

export const outsourceService = {
  getLabs: () => api.get('/outsource/labs').then(r => r.data),
  createLab: (data: any) => api.post('/outsource/labs', data).then(r => r.data),
  updateLab: (id: string, data: any) => api.put(`/outsource/labs/${id}`, data).then(r => r.data),
  deleteLab: (id: string) => api.delete(`/outsource/labs/${id}`).then(r => r.data),

  getOutsourceSummary: () => api.get('/outsource/summary').then(r => r.data),
  getOutsourcedSamples: (params?: any) => api.get('/outsource/samples', { params }).then(r => r.data),
  createOutsourceSample: (data: any) => api.post('/outsource/samples', data).then(r => r.data),
  updateSampleStatus: (id: string, data: any) => api.patch(`/outsource/samples/${id}`, data).then(r => r.data),
  deleteOutsourceSample: (id: string) => api.delete(`/outsource/samples/${id}`).then(r => r.data),
};

export const googleReviewService = {
  getConfig: () => api.get('/reviews/config').then(r => r.data),
  updateConfig: (data: any) => api.put('/reviews/config', data).then(r => r.data),
  trackClick: () => api.post('/reviews/track-click').then(r => r.data),
  trackSent: () => api.post('/reviews/track-sent').then(r => r.data),
};

export const adminUserService = {
  getAdminUsers: () => api.get('/admin-users').then(r => r.data),
  createAdminUser: (data: any) => api.post('/admin-users', data).then(r => r.data),
  updateAdminUser: (id: string, data: any) => api.put(`/admin-users/${id}`, data).then(r => r.data),
  deleteAdminUser: (id: string) => api.delete(`/admin-users/${id}`).then(r => r.data),
};

export const doctorService = {
  getDoctors: (params?: { branchId?: string; cityId?: string; partnerId?: string; search?: string }) =>
    api.get('/doctors', { params }).then(r => r.data),
  getDoctorById: (id: string) => api.get(`/doctors/${id}`).then(r => r.data),
  createDoctor: (data: any) => api.post('/doctors', data).then(r => r.data),
  updateDoctor: (id: string, data: any) => api.put(`/doctors/${id}`, data).then(r => r.data),
  deleteDoctor: (id: string) => api.delete(`/doctors/${id}`).then(r => r.data),
  uploadSignature: (file: File) => {
    const form = new FormData();
    form.append('signature', file);
    return api.post('/doctors/upload-signature', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const staffService = {
  getStaff: (params?: { branchId?: string; department?: string; designation?: string; search?: string }) =>
    api.get('/staff', { params }).then(r => r.data),
  getStaffById: (id: string) => api.get(`/staff/${id}`).then(r => r.data),
  createStaff: (data: any) => api.post('/staff', data).then(r => r.data),
  updateStaff: (id: string, data: any) => api.put(`/staff/${id}`, data).then(r => r.data),
  deleteStaff: (id: string) => api.delete(`/staff/${id}`).then(r => r.data),
  uploadSignature: (file: File) => doctorService.uploadSignature(file),
};

export const rbacService = {

  getRoles: () => api.get('/roles').then(r => r.data),
  getRoleById: (id: string) => api.get(`/roles/${id}`).then(r => r.data),
  createRole: (data: any) => api.post('/roles', data).then(r => r.data),
  updateRole: (id: string, data: any) => api.put(`/roles/${id}`, data).then(r => r.data),
  deleteRole: (id: string) => api.delete(`/roles/${id}`).then(r => r.data),
  cloneRole: (id: string) => api.post(`/roles/${id}/clone`).then(r => r.data),
  getAllPermissions: () => api.get('/roles/permissions').then(r => r.data),
  getAuditLogs: () => api.get('/roles/audit-logs').then(r => r.data),
  assignAdminRole: (data: any) => api.post('/roles/admin-users', data).then(r => r.data),
};

export const packageService = {
  getAllPackages: async () => {
    const response = await api.get('/packages');
    return response.data;
  },
  createPackage: async (data: any) => {
    const response = await api.post('/packages', data);
    return response.data;
  },
};

export const testService = {
  getBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },
  createWalkinBooking: async (data: {
    patientName: string;
    mobile: string;
    address: string;
    gender: string;
    age: number | string;
    reference?: string;
    testIds?: string[];
    packageIds?: string[];
    branchId?: string;
  }) => {
    try {
      console.log('[API] Calling POST /bookings/walkin with payload:', data);
      const response = await api.post('/bookings/walkin', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('[API] /bookings/walkin returned 404 on server. Executing dynamic fallback booking...');
        const cleanMobile = data.mobile ? data.mobile.trim().replace(/\D/g, '').slice(-10) : '';
        const fallbackPayload = {
          patientName: data.patientName.trim(),
          mobile: cleanMobile,
          patientAge: Number(data.age),
          patientGender: data.gender,
          scheduledDate: new Date().toISOString(),
          scheduledSlot: 'Walk-in / Immediate',
          collectionMode: 'LAB',
          paymentMethod: 'cash',
          testIds: data.testIds || [],
          packageIds: data.packageIds || [],
          branchId: data.branchId || undefined,
        };
        const fallbackRes = await api.post('/bookings', fallbackPayload);
        return fallbackRes.data;
      }
      throw error;
    }
  },
  updateBookingStatus: async (id: string, status: string) => {
    const response = await api.patch(`/bookings/${id}/status`, { status });
    return response.data;
  },
  getAllTests: async () => {
    const response = await api.get('/tests');
    return response.data;
  },
  createTest: async (data: any) => {
    const response = await api.post('/tests', data);
    return response.data;
  },
  updateTest: async (id: string, data: any) => {
    const response = await api.put(`/tests/${id}`, data);
    return response.data;
  },
  addTestParameter: async (testId: string, data: any) => {
    const response = await api.post(`/tests/${testId}/parameters`, data);
    return response.data;
  },
  getTestParameters: async (testId: string) => {
    const response = await api.get(`/tests/${testId}/parameters`);
    return response.data;
  },
  createReport: async (data: any) => {
    const response = await api.post('/reports', data);
    return response.data;
  },
  verifyReport: async (id: string) => {
    const response = await api.patch(`/reports/${id}/verify`);
    return response.data;
  },
  getRegisteredUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },
  updatePaymentStatus: async (id: string, paymentStatus: string, paymentMode?: string) => {
    const response = await api.patch(`/bookings/${id}/payment`, { paymentStatus, paymentMode });
    return response.data;
  },
  assignExecutive: async (id: string, executiveId: string) => {
    const response = await api.patch(`/bookings/${id}/assign-executive`, { executiveId });
    return response.data;
  },
  getExecutives: async () => {
    const response = await api.get('/auth/users?role=EXECUTIVE');
    return response.data;
  },
  assignPartner: async (bookingId: string, partnerId: string) => {
    const response = await api.patch(`/bookings/${bookingId}/assign-partner`, { partnerId });
    return response.data;
  },
  updateLabStatus: async (id: string, status: string) => {
    const response = await api.patch(`/bookings/${id}/update-lab-status`, { status });
    return response.data;
  },
  initiateRazorpayCheckout: async (id: string) => {
    const response = await api.post(`/bookings/${id}/payment-link`);
    return response.data;
  },
  checkPaymentStatus: async (id: string) => {
    const response = await api.get(`/bookings/${id}/payment-link/status`);
    return response.data;
  },
  acceptLabBooking: async (id: string) => {
    const response = await api.patch(`/bookings/${id}/accept-lab`);
    return response.data;
  },
  acceptDispatchBooking: async (id: string) => {
    const response = await api.patch(`/bookings/${id}/accept-dispatch`);
    return response.data;
  },
  rejectLabBooking: async (id: string, reason: string) => {
    const response = await api.patch(`/bookings/${id}/reject-lab`, { reason });
    return response.data;
  },
  sendInvoice: async (id: string) => {
    const response = await api.post(`/bookings/${id}/send-invoice`);
    return response.data;
  },
  getAvailablePartners: async (params?: { branchId?: string; cityId?: string }) => {
    const response = await api.get('/auth/partners/available', { params });
    return response.data;
  },
  getPartners: async (statusOrParams?: string | { status?: string; branchId?: string }) => {
    let url = '/auth/partners';
    if (typeof statusOrParams === 'string') {
      url = statusOrParams ? `/auth/partners?status=${statusOrParams}` : '/auth/partners';
    } else if (statusOrParams) {
      const q = new URLSearchParams();
      if (statusOrParams.status && statusOrParams.status !== 'ALL') q.append('status', statusOrParams.status);
      if (statusOrParams.branchId && statusOrParams.branchId !== 'ALL' && statusOrParams.branchId !== 'all') q.append('branchId', statusOrParams.branchId);
      const qs = q.toString();
      url = qs ? `/auth/partners?${qs}` : '/auth/partners';
    }
    const response = await api.get(url);
    return response.data;
  },
  createPartner: async (data: any) => {
    const response = await api.post('/auth/partners', data);
    return response.data;
  },
  updatePartner: async (id: string, data: any) => {
    const response = await api.put(`/auth/partners/${id}`, data);
    return response.data;
  },
  deletePartner: async (id: string) => {
    const response = await api.delete(`/auth/partners/${id}`);
    return response.data;
  },
  updatePartnerApproval: async (id: string, approvalStatus: string, rejectionReason?: string, correctionReason?: string) => {
    const response = await api.patch(`/auth/partners/${id}/approval`, { approvalStatus, rejectionReason, correctionReason });
    return response.data;
  },
  getPartnerDetails: async (id: string) => {
    const response = await api.get(`/auth/partners/${id}/details`);
    return response.data;
  },
  updatePartnerDocumentStatus: async (partnerId: string, docId: string, status: string, rejectionReason?: string, correctionReason?: string) => {
    const response = await api.patch(`/auth/partners/${partnerId}/documents/${docId}`, { status, rejectionReason, correctionReason });
    return response.data;
  },
  getPartnerRatings: async (partnerId: string) => {
    const response = await api.get(`/partner/${partnerId}/ratings`);
    return response.data;
  },
};

export const patientService = {
  getPatients: async (params?: { branchId?: string; search?: string; role?: string }) => {
    const response = await api.get('/auth/users', { params: { role: 'USER', ...params } });
    return response.data;
  },
  createPatient: async (data: any) => {
    const response = await api.post('/auth/users', data);
    return response.data;
  },
  updatePatient: async (id: string, data: any) => {
    const response = await api.put(`/auth/users/${id}`, data);
    return response.data;
  },
  deletePatient: async (id: string) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },
};

export const sampleService = {
  getQueue: () => api.get('/samples/queue').then(r => r.data),
  receiveSample: (data: {
    bookingId: string;
    sampleType: string;
    condition: string;
    notes?: string;
    rejectionReason?: string;
  }) => api.post('/samples/receive', data).then(r => r.data),
  startProcessing: (bookingId: string) =>
    api.patch(`/samples/${bookingId}/process`).then(r => r.data),
};

export const authService = {
  getMe: () => api.get('/auth/me').then(r => r.data),
};

export const couponService = {
  getAll: () => api.get('/coupons').then(r => r.data),
  getById: (id: string) => api.get(`/coupons/${id}`).then(r => r.data),
  create: (data: any) => api.post('/coupons', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/coupons/${id}`, data).then(r => r.data),
  toggleStatus: (id: string, isActive: boolean) => api.patch(`/coupons/${id}/status`, { isActive }).then(r => r.data),
  delete: (id: string) => api.delete(`/coupons/${id}`).then(r => r.data),
  getAnalytics: () => api.get('/coupons/analytics').then(r => r.data),
};

export const financeService = {
  getSummary: () => api.get('/finance/payment-summary').then(r => r.data),
  getPayments: (params?: { page?: number; limit?: number; status?: string; from?: string; to?: string }) =>
    api.get('/finance/payments', { params }).then(r => r.data),
  getPaymentById: (id: string) => api.get(`/finance/payments/${id}`).then(r => r.data),
  getConfig: () => api.get('/payments/config').then(r => r.data),
  createOrder: (bookingId: string) => api.post('/payments/create-order', { bookingId }).then(r => r.data),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: string;
  }) => api.post('/payments/verify', data).then(r => r.data),
  getInvoice: (bookingId: string) => api.get(`/payments/invoice/${bookingId}`).then(r => r.data),
  regenerateInvoice: (bookingId: string) => api.post(`/payments/invoice/${bookingId}/regenerate`).then(r => r.data),
  getRefunds: (status?: string) => api.get('/finance/refunds', { params: status ? { status } : {} }).then(r => r.data),
  requestRefund: (data: { paymentId: string; amount: number; reason: string; approvalNotes?: string }) =>
    api.post('/finance/refunds', data).then(r => r.data),
  approveRefund: (id: string) => api.post(`/finance/refunds/${id}/approve`).then(r => r.data),
  executeRefund: (paymentId: string, data: { refundType: 'FULL' | 'PARTIAL'; amount?: number; reason: string }) =>
    api.post(`/finance/payments/${paymentId}/refund`, data).then(r => r.data),
  rejectRefund: (id: string, reason: string) => api.post(`/finance/refunds/${id}/reject`, { reason }).then(r => r.data),
  getSettlements: (status?: string) => api.get('/finance/settlements', { params: status ? { status } : {} }).then(r => r.data),
  generateSettlement: (data: { periodStart: string; periodEnd: string; franchiseName: string; franchiseId?: string; commissionRate?: number }) =>
    api.post('/finance/settlements/generate', data).then(r => r.data),
  processSettlement: (id: string) => api.post(`/finance/settlements/${id}/process`).then(r => r.data),
};
export const analyticsService = {
  getDashboard: (params?: Record<string, string>) => api.get('/analytics/dashboard', { params }).then(r => r.data),
  exportCSV: (params?: Record<string, string>) => api.get('/analytics/export-csv', { params, responseType: 'blob' }).then(r => r.data),
};

export const auditService = {
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
    severity?: string;
    status?: string;
    userId?: string;
    branchId?: string;
    from?: string;
    to?: string;
  }) => api.get('/admin/audit-logs', { params }).then(r => r.data),

  getAuditLogById: (id: string) =>
    api.get(`/admin/audit-logs/${id}`).then(r => r.data),

  getAuditModules: () =>
    api.get('/admin/audit-logs/modules').then(r => r.data),

  exportAuditLogs: (params?: { from?: string; to?: string; module?: string; severity?: string }) =>
    api.get('/admin/audit-logs/export', { params, responseType: 'blob' }).then(r => r.data),

  getApiRequestLogs: (params?: {
    page?: number;
    limit?: number;
    method?: string;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => api.get('/admin/audit-logs/api-requests', { params }).then(r => r.data),
};

export const cmsService = {
  getBanners: () => api.get('/cms/banners').then(r => r.data),
  createBanner: (data: any) => api.post('/cms/banners', data).then(r => r.data),
  updateBanner: (id: string, data: any) => api.put(`/cms/banners/${id}`, data).then(r => r.data),
  deleteBanner: (id: string) => api.delete(`/cms/banners/${id}`).then(r => r.data),
  uploadBannerImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/cms/banners/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  getConfig: () => api.get('/cms/config').then(r => r.data),
  updateConfig: (data: any) => api.put('/cms/config', data).then(r => r.data),
  getAlerts: () => api.get('/cms/alerts').then(r => r.data),
  upsertAlert: (data: any) => api.post('/cms/alerts', data).then(r => r.data),
  deleteAlert: (id: string) => api.delete(`/cms/alerts/${id}`).then(r => r.data),
  getPages: () => api.get('/cms/pages').then(r => r.data),
  updatePage: (slug: string, data: any) => api.put(`/cms/pages/${slug}`, data).then(r => r.data),
  getAuditLogs: () => api.get('/cms/audit-logs').then(r => r.data),
};
export const settingsService = {
  getSettings: () => api.get('/settings').then(r => r.data),
  updateSettings: (data: SettingsUpdateDTO) => api.put('/settings', data).then(r => r.data),
  getVersion: () => api.get('/settings/version').then(r => r.data),
};

export type ReportDeliveryMode = 'AUTO_PUSH' | 'MANUAL_DISPATCH';

export interface SystemSettings {
  id: string;
  minimumHomeCollectionAmount: number;
  homeCollectionCharge: number;
  defaultPartnerCommission: number;
  labOpenTime: string;
  labCloseTime: string;
  reportDeliveryMode: ReportDeliveryMode;
  currency: string;
  timezone: string;
  platformVersion: string;
  maintenanceMode: boolean;
  allowBookings: boolean;
  allowPartnerRegistration: boolean;
  referralRewardAmount: number;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export type SettingsUpdateDTO = Partial<Omit<SystemSettings, 'id' | 'updatedBy' | 'updatedAt' | 'createdAt'>>;

export const collectionPartnerService = {
  getSummary: (params?: { branchId?: string; labId?: string }) => api.get('/collection-partners/summary', { params }).then(r => r.data),
  getPartners: (params?: { search?: string; labId?: string; branchId?: string; status?: string; date?: string; startDate?: string; endDate?: string }) =>
    api.get('/collection-partners', { params }).then(r => r.data),
  getPartnerDetails: (id: string, params?: { date?: string; startDate?: string; endDate?: string; status?: string; labId?: string; branchId?: string }) =>
    api.get(`/collection-partners/${id}`, { params }).then(r => r.data),
  getDailySummary: (params?: { partnerId?: string; labId?: string; branchId?: string; status?: string; date?: string; startDate?: string; endDate?: string }) =>
    api.get('/collection-partners/daily-summary', { params }).then(r => r.data),
  getLabWise: (params?: { partnerId?: string; labId?: string; branchId?: string; date?: string; startDate?: string; endDate?: string }) =>
    api.get('/collection-partners/lab-wise', { params }).then(r => r.data),
  updatePartnerStatus: (id: string, data: any) =>
    api.patch(`/collection-partners/${id}/status`, data).then(r => r.data),
  deletePartner: (id: string) =>
    api.delete(`/collection-partners/${id}`).then(r => r.data),
  creditCommissionPayout: (data: { bookingId: string; partnerId: string; status?: string; notes?: string }) =>
    api.patch('/collection-partners/commissions/payout', data).then(r => r.data),
};

export default api;

