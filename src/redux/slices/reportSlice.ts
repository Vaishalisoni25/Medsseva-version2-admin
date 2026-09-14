import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';


interface ReportState {
  reports: any[];
  bookingsForReport: any[];
  loading: boolean;
  bookingsLoading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  reports: [],
  bookingsForReport: [],
  loading: false,
  bookingsLoading: false,
  error: null,
};

export const fetchAllReports = createAsyncThunk('reports/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports');
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to fetch reports');
  }
});

export const fetchBookingsForReport = createAsyncThunk('reports/fetchBookings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/bookings-for-report');
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to fetch bookings');
  }
});

export const createReportThunk = createAsyncThunk('reports/create', async (payload: any, { rejectWithValue }) => {
  try {
    const res = await api.post('/reports', payload);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to create report');
  }
});

export const updateReportDraftThunk = createAsyncThunk('reports/updateDraft', async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/${id}/draft`, payload);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to update draft');
  }
});

export const finalizeReportThunk = createAsyncThunk('reports/finalize', async (id: string, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/${id}/finalize`);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to finalize report');
  }
});

export const verifyReportThunk = createAsyncThunk('reports/verify', async (id: string, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/${id}/verify`);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to submit report for review');
  }
});

export const sendReportThunk = createAsyncThunk('reports/send', async ({ id, recipientType, recipientId, channels }: { id: string; recipientType: string; recipientId: string; channels?: string[] }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/${id}/send`, { recipientType, recipientId, channels });
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to send report');
  }
});

export const savePdfUrlThunk = createAsyncThunk('reports/savePdfUrl', async ({ id, pdfUrl, pdfPublicId }: { id: string; pdfUrl: string; pdfPublicId: string }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/${id}/pdf-url`, { pdfUrl, pdfPublicId });
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to save PDF URL');
  }
});

export const uploadReportPdfThunk = createAsyncThunk('reports/uploadPdf', async ({ id, formData }: { id: string; formData: FormData }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/reports/${id}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error || 'Failed to upload report PDF');
  }
});
const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllReports.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllReports.fulfilled, (state, action) => { state.loading = false; state.reports = action.payload; })
      .addCase(fetchAllReports.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchBookingsForReport.pending, (state) => { state.bookingsLoading = true; })
      .addCase(fetchBookingsForReport.fulfilled, (state, action) => { state.bookingsLoading = false; state.bookingsForReport = action.payload; })
      .addCase(fetchBookingsForReport.rejected, (state) => { state.bookingsLoading = false; })
      .addCase(createReportThunk.fulfilled, (state, action) => { state.reports.unshift(action.payload); })
      .addCase(updateReportDraftThunk.fulfilled, (state, action) => {
        const idx = state.reports.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.reports[idx] = action.payload;
      })
      .addCase(finalizeReportThunk.fulfilled, (state, action) => {
        const idx = state.reports.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.reports[idx] = action.payload;
      })
      .addCase(verifyReportThunk.fulfilled, (state, action) => {
        const idx = state.reports.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.reports[idx] = action.payload;
      })
     .addCase(sendReportThunk.fulfilled, (state, action) => {
        const idx = state.reports.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.reports[idx] = action.payload;
      })
      .addCase(savePdfUrlThunk.fulfilled, (state, action) => {
        const idx = state.reports.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.reports[idx] = action.payload;
      });
  },
});

export default reportSlice.reducer;