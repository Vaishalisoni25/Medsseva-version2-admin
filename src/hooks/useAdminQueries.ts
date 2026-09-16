import { useQuery } from '@tanstack/react-query';
import { useAppDispatch } from '@/redux/hooks';
import api, {
  testService,
  adminUserService,
  rbacService,
  sampleService,
  analyticsService,
  auditService,
  patientService,
} from '@/services/api';
import { fetchBookings } from '@/redux/slices/bookingSlice';
import { fetchTests, fetchPackages } from '@/redux/slices/testSlice';
import { fetchAllReports, fetchBookingsForReport } from '@/redux/slices/reportSlice';
import { fetchCoupons, fetchCouponAnalytics } from '@/redux/slices/couponSlice';
import { fetchSummary, fetchPayments, fetchRefunds, fetchSettlements } from '@/redux/slices/financeSlice';
import { fetchBanners, fetchConfig, fetchAlerts, fetchPages, fetchAuditLogs as fetchCmsAuditLogs } from '@/redux/slices/cmsSlice';
import { fetchInventoryItems, fetchTransactions, fetchSuppliers, fetchAnalytics as fetchInventoryAnalytics } from '@/redux/slices/inventorySlice';
import { fetchBranches } from '@/redux/slices/branchSlice';

const STALE = 7 * 60 * 1000;
const GC = 15 * 60 * 1000;
const BASE_OPTS = { staleTime: STALE, gcTime: GC, refetchOnMount: false, refetchOnWindowFocus: false };

function useThunkQuery(key: string[], thunkCreator: () => any) {
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await dispatch(thunkCreator());
      return result.payload ?? null;
    },
    ...BASE_OPTS,
  });
}

export const useBookingsQuery = () => useThunkQuery(['bookings'], fetchBookings);
export const useTestsQuery = () => useThunkQuery(['tests'], fetchTests);
export const usePackagesQuery = () => useThunkQuery(['packages'], fetchPackages);
export const useReportsQuery = () => useThunkQuery(['reports'], fetchAllReports);
export const useBookingsForReportQuery = () => useThunkQuery(['bookingsForReport'], fetchBookingsForReport);
export const useCouponsQuery = () => useThunkQuery(['coupons'], fetchCoupons);
export const useCouponAnalyticsQuery = () => useThunkQuery(['couponAnalytics'], fetchCouponAnalytics);
export const usePaymentSummaryQuery = () => useThunkQuery(['paymentSummary'], fetchSummary);
export const useCmsBannersQuery = () => useThunkQuery(['cmsBanners'], fetchBanners);
export const useCmsConfigQuery = () => useThunkQuery(['cmsConfig'], fetchConfig);
export const useCmsAlertsQuery = () => useThunkQuery(['cmsAlerts'], fetchAlerts);
export const useCmsPagesQuery = () => useThunkQuery(['cmsPages'], fetchPages);
export const useCmsAuditLogsQuery = () => useThunkQuery(['cmsAuditLogs'], fetchCmsAuditLogs);
export const useInventorySuppliersQuery = () => useThunkQuery(['inventorySuppliers'], fetchSuppliers);
export const useInventoryAnalyticsQuery = () => useThunkQuery(['inventoryAnalytics'], fetchInventoryAnalytics);
export const useBranchesQuery = () => useThunkQuery(['branches'], fetchBranches);

export function usePaymentsQuery(params?: any) {
  const dispatch = useAppDispatch();
  return useQuery({ queryKey: ['payments', params], queryFn: async () => { const r = await dispatch(fetchPayments(params)); return r.payload ?? null; }, ...BASE_OPTS });
}
export function useRefundsQuery(status?: string) {
  const dispatch = useAppDispatch();
  return useQuery({ queryKey: ['refunds', status], queryFn: async () => { const r = await dispatch(fetchRefunds(status)); return r.payload ?? null; }, ...BASE_OPTS });
}
export function useSettlementsQuery(status?: string) {
  const dispatch = useAppDispatch();
  return useQuery({ queryKey: ['settlements', status], queryFn: async () => { const r = await dispatch(fetchSettlements(status)); return r.payload ?? null; }, ...BASE_OPTS });
}
export function useInventoryQuery(params?: any) {
  const dispatch = useAppDispatch();
  return useQuery({ queryKey: ['inventory', params], queryFn: async () => { const r = await dispatch(fetchInventoryItems(params ?? {})); return r.payload ?? null; }, ...BASE_OPTS });
}
export function useInventoryTransactionsQuery(params?: any) {
  const dispatch = useAppDispatch();
  return useQuery({ queryKey: ['inventoryTransactions', params], queryFn: async () => { const r = await dispatch(fetchTransactions(params ?? {})); return r.payload ?? null; }, ...BASE_OPTS });
}
export const useAdminUsersQuery = () => useQuery({ queryKey: ['adminUsers'], queryFn: () => adminUserService.getAdminUsers(), ...BASE_OPTS });
export const useRolesQuery = () => useQuery({ queryKey: ['roles'], queryFn: () => rbacService.getRoles(), ...BASE_OPTS });
export const useAllPermissionsQuery = () => useQuery({ queryKey: ['allPermissions'], queryFn: () => rbacService.getAllPermissions(), ...BASE_OPTS });
export const useSampleQueueQuery = () => useQuery({ queryKey: ['sampleQueue'], queryFn: () => sampleService.getQueue(), ...BASE_OPTS });
export const useUsersQuery = () => useQuery({ queryKey: ['users'], queryFn: () => testService.getRegisteredUsers(), ...BASE_OPTS });
export const usePatientsQuery = (params?: { branchId?: string; search?: string }) =>
  useQuery({ queryKey: ['patients', params], queryFn: () => patientService.getPatients(params), ...BASE_OPTS, refetchOnMount: 'always' });
export function usePartnersQuery(params?: { status?: string; branchId?: string } | string) {
  return useQuery({ queryKey: ['partners', params], queryFn: () => testService.getPartners(params), ...BASE_OPTS, refetchOnMount: 'always', staleTime: 0 });
}
export function useAnalyticsDashboardQuery(params?: Record<string, string>) {
  return useQuery({ queryKey: ['analyticsDashboard', params], queryFn: () => analyticsService.getDashboard(params), ...BASE_OPTS });
}
export function useAuditLogsQuery(params?: any) {
  return useQuery({ queryKey: ['auditLogs', params], queryFn: () => auditService.getAuditLogs(params), ...BASE_OPTS });
}
export function useApiLogsQuery(params?: any) {
  return useQuery({ queryKey: ['apiLogs', params], queryFn: () => auditService.getApiRequestLogs(params), ...BASE_OPTS });
}
export function useNotificationLogsQuery(page: number, status: string) {
  const params: any = { page };
  if (status !== 'ALL') params.status = status;
  return useQuery({ queryKey: ['notificationLogs', page, status], queryFn: () => api.get('/notifications/logs', { params }).then(r => r.data), ...BASE_OPTS });
}
export function usePrescriptionsQuery(params?: any) {
  return useQuery({ queryKey: ['prescriptions', params], queryFn: () => api.get('/prescriptions', { params }).then(r => r.data), ...BASE_OPTS });
}
export const useSupportConversationsQuery = (params?: any) =>
  useQuery({ queryKey: ['supportConversations', params], queryFn: () => api.get('/chat/conversations', { params }).then(r => r.data), ...BASE_OPTS });