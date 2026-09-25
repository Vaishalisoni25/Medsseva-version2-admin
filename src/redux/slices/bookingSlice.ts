import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Booking, BookingStatus } from '../../types';
import { testService } from '../../services/api';


interface BookingState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  loading: false,
  error: null,
};

export const fetchBookings = createAsyncThunk('bookings/fetchBookings', async () => {
  const response = await testService.getBookings();
  return response;
});

export const startBookingPolling = () => (dispatch: any) => {
  // Refetch every 30 seconds so partner acceptance reflects without manual reload
  const interval = setInterval(() => {
    dispatch(fetchBookings());
  }, 30000);
  return () => clearInterval(interval);
};
export const updateBookingStatusAsync = createAsyncThunk(
  'bookings/updateStatus',
  async ({ id, status }: { id: string; status: BookingStatus }) => {
    const response = await testService.updateBookingStatus(id, status);
    return response;
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.unshift(action.payload);
    },
    updateBookingStatus: (state, action: PayloadAction<{ id: string; status: BookingStatus }>) => {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index].status = action.payload.status;
      }
    },
assignPersonnel: (state, action: PayloadAction<{ id: string; phlebotomistId?: string; technicianId?: string }>) => {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        if (action.payload.phlebotomistId) {
          state.bookings[index].phlebotomistId = action.payload.phlebotomistId;
          state.bookings[index].status = 'Assigned';
        }
        if (action.payload.technicianId) {
          state.bookings[index].technicianId = action.payload.technicianId;
        }
      }
    },
    assignPartnerLocal: (state, action: PayloadAction<{ id: string; partnerId: string; partnerName: string }>) => {
      const index = state.bookings.findIndex(b => b.id === action.payload.id);
      if (index !== -1) {
        (state.bookings[index] as any).assignedPartnerId = action.payload.partnerId;
        (state.bookings[index] as any).assignedPartnerName = action.payload.partnerName;
        state.bookings[index].status = 'Assigned';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        
        let enriched = action.payload.map((b: any, index: number) => {
          // Distribute bookings across cities dynamically if they don't have it
          const cities = ['dl', 'mum', 'blr', 'ind'];
          const franchises = ['fr-101', 'fr-102', 'fr-103', 'fr-104'];
          const cityId = b.cityId || cities[index % 4];
          const franchiseId = b.franchiseId || franchises[index % 4];
          
          let branchId = b.branchId || 'all';
          if (cityId === 'dl') branchId = 'dl-west';
          else if (cityId === 'mum') branchId = 'mum-c';
          else if (cityId === 'blr') branchId = 'blr-wf';
          else if (cityId === 'ind') branchId = 'ind-vn';

return {
            ...b,
            bookingCode: b.bookingCode,
            patient: {
              name: b.patientName || b.user?.name || 'Unknown',
              phone: b.patientMobile || b.user?.mobile || 'N/A',
              address: b.address ? `${b.address.line1}, ${b.address.city}` : 'N/A',
              gender: b.patientGender || 'N/A',
              age: b.patientAge || '-'
            },
            bookingDate: new Date(b.scheduledDate).toLocaleDateString(),
            collectionSlot: b.scheduledSlot,
            packages: b.packages ? b.packages.map((bp: any) => bp.package) : [],
            tests: b.tests ? b.tests.map((bt: any) => bt.test) : [],
            totalAmount: b.totalPaid,
           rawStatus: b.status,
            status: (() => {
              const statusMap: Record<string, string> = {
                PENDING: 'Pending',
                WAITING_FOR_ASSIGNMENT: 'Pending',
                CONFIRMED: 'Confirmed',
                DELIVERED_TO_LAB: 'Doctor Reference',
                PATIENT_REACHED_LAB: 'PATIENT_REACHED_LAB',
                SAMPLE_COLLECTED: 'Collected',
                PROCESSING: 'Processing',
                REPORT_READY: 'Approved',
                COMPLETED: 'Completed',
                CANCELLED: 'Cancelled',
                REJECTED: 'Cancelled',
              };
              return statusMap[b.status] || (b.status.charAt(0).toUpperCase() + b.status.slice(1).toLowerCase());
            })(),
            address: b.address,
            cityId: b.address?.city?.toLowerCase().slice(0, 3) || 'N/A',
            franchiseId: b.franchiseId || undefined,
            branchId: b.branchId || (b.assignedPartner?.branchId) || undefined,
            assignedPartnerId: b.assignedPartnerId || null,
            assignedPartner: b.assignedPartner || null,
          };
        });

    state.bookings = enriched;
      })
.addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch bookings';
      })
.addCase(updateBookingStatusAsync.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          const raw = action.payload.status;
          const statusMap: Record<string, string> = {
            PENDING: 'Pending',
            WAITING_FOR_ASSIGNMENT: 'Pending',
            CONFIRMED: 'Confirmed',
            DELIVERED_TO_LAB: 'Doctor Reference',
            PATIENT_REACHED_LAB: 'PATIENT_REACHED_LAB',
            SAMPLE_COLLECTED: 'Collected',
            PROCESSING: 'Processing',
            REPORT_READY: 'Approved',
            COMPLETED: 'Completed',
            CANCELLED: 'Cancelled',
            REJECTED: 'Cancelled',
          };
          (state.bookings[index] as any).rawStatus = raw;
          state.bookings[index].status = statusMap[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
        }
      });
  }
});

export const { addBooking, updateBookingStatus, assignPersonnel, assignPartnerLocal } = bookingSlice.actions;
export default bookingSlice.reducer;
