export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  imagePublicId?: string;
  bannerType?: 'HERO' | 'PROMO';
  linkType: 'Test' | 'Package' | 'Category' | 'External';
  linkValue?: string;
  priority: number;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
  cities: string[];
  branches: string[];
  isActive: boolean;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFlags {
  enableOnlineConsultations: boolean;
  enableAiSymptomsChat: boolean;
  enableReportsWallet: boolean;
  enableUrgentCollection: boolean;
  enableHomeCollection: boolean;
  enablePrescriptionUpload: boolean;
  enableReferralProgram: boolean;
  enableHealthTracker: boolean;
  enableNotifications: boolean;
  enableAppointments: boolean;
}

export interface MaintenanceConfig {
  globalMaintenance: boolean;
  disableBookings: boolean;
  disablePayments: boolean;
  disableHomeCollection: boolean;
  disableReports: boolean;
  maintenanceMessage: string;
  maintenanceStart: string | null;
  maintenanceEnd: string | null;
}

export interface MinVersionConfig {
  minAndroid: string;
  minIOS: string;
  forceUpdate: boolean;
  updateMessage: string;
}

export interface ContactInfo {
  supportPhone: string;
  whatsapp: string;
  email: string;
  address: string;
  workingHours: string;
  emergencyContact: string;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  website: string;
}

export interface CmsConfig {
  id: string;
  layoutSections: string[];
  categoryOrder: string[];
  featureFlags: FeatureFlags;
  maintenance: MaintenanceConfig;
  minVersion: MinVersionConfig;
  contactInfo: ContactInfo;
  socialLinks: SocialLinks;
  updatedAt?: string;
}

export interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  startTime: string;
  endTime?: string;
  cities: string[];
  branches: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

export interface CmsAuditLog {
  id: string;
  adminId?: string;
  adminRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: object;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiryDate: string;
  isActive: boolean;
  usageCount: number;
}

export interface Campaign {
  id: string;
  title: string;
  channel: 'SMS' | 'WhatsApp' | 'Email' | 'Push';
  recipientsCount: number;
  scheduledFor: string;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Failed';
  messageTemplate: string;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  statusCode: number;
  latencyMs: number;
  ip: string;
  userAgent: string;
}