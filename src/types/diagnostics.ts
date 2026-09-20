export type TestCategory = 
  | 'Blood' 
  | 'Diabetes' 
  | 'Thyroid' 
  | 'Cardiac' 
  | 'Liver' 
  | 'Vitamins' 
  | 'Fever'
  | 'General'
  | 'Full Body';

export interface ReferenceRange {
  gender: 'MALE' | 'FEMALE' | 'ANY';
  minAge: number;
  maxAge: number;
  minRange: number;
  maxRange: number;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  referenceRanges: ReferenceRange[];
}

export interface MedicalTest {
  id: string;
  code: string;
  name: string;
  category: TestCategory;
  subCategory?: string;
  description: string;
  price: number;
  discountedPrice?: number;
  fastingRequired: boolean;
  reportTimeHours: number;
  sampleType: string;
  status: 'active' | 'inactive';
  parameters: TestParameter[];
}

export interface MedicalPackage {
  id: string;
  name: string;
  code: string;
  description: string;
  testIds: string[];
  price: number;
  discountedPrice?: number;
  bannerUrl?: string;
  status: 'active' | 'inactive';
  priorityRank?: number; // Mobile render ordering
  isSevaCheck?: boolean; // Premium badge
}

export type BookingStatus = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Assigned' 
  | 'Collected' 
  | 'Received' 
  | 'Accessioned' 
  | 'Processing' 
  | 'Under QC'
  | 'Approved'
  | 'Completed' 
  | 'Cancelled'
  | 'Sample Rejected';

export type SampleCondition = 'Good' | 'Haemolysed' | 'Insufficient Quantity' | 'Leaked';

export interface PatientInfo {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  address: string;
}

export interface SampleTrackingDetails {
  barcodeId?: string;
  accessionNo?: string;
  collectedAt?: string;
  receivedAt?: string;
  accessionedAt?: string;
  sampleCondition?: SampleCondition;
  rerunCount?: number;
  rejectedReason?: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  patient: PatientInfo;
  tests: MedicalTest[];
  packages: MedicalPackage[];
  bookingDate: string;
  collectionSlot: string;
  status: BookingStatus;
  paymentStatus: 'Pending' | 'Paid' | 'Refunded';
  paymentMethod?: 'Online' | 'Cash' | 'UPI' | 'Card';
  totalAmount: number;
  phlebotomistId?: string;
  technicianId?: string;
  franchiseId?: string;
  cityId?: string; // Segregation
  branchId?: string; // Segregation
createdAt: string;
  updatedAt?: string;
  address?: {
    id: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    type: string;
  };
  
  // LIMS Logistics expansion
  sampleDetails?: SampleTrackingDetails;
  
  // SLA Tracking
  tatDeadline?: string; // Expected Report Publishing Time
  isSlaBreached?: boolean;
}

export interface ParameterResult {
  parameterId: string;
  parameterName: string;
  value: number | string;
  isAbnormal: boolean;
  isCritical: boolean;
  remarks?: string;
}

export interface ReportAuditTrail {
  timestamp: string;
  action: string; // 'Draft Saved', 'Submitted to QC', 'Value Updated', 'Approved'
  performedBy: string;
  details?: string;
}

export interface PathologyReport {
  id: string;
  bookingId: string;
  bookingCode: string;
  patient: PatientInfo;
  results: Record<string, ParameterResult[]>; // key is TestId
  aiSummary?: string;
  aiRecommendations?: string[];
  status: 'Draft' | 'Under QC' | 'Approved' | 'Published';
  approvedByDoctorId?: string;
  approvedAt?: string;
  digitalSignatureUrl?: string;
  qrVerificationCode?: string;
  
  // Audit Trails
  editHistory?: ReportAuditTrail[];
  historicalComparisonIds?: string[]; // Prior report linkage for trendlines
}
