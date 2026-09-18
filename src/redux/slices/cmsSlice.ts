import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Banner, CmsConfig, EmergencyAlert, CmsPage, CmsAuditLog } from '../../types/cms';
import { cmsService } from '../../services/api';

interface CmsState {
  banners: Banner[];
  config: CmsConfig | null;
  alerts: EmergencyAlert[];
  pages: CmsPage[];
  auditLogs: CmsAuditLog[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: CmsState = {
  banners: [],
  config: null,
  alerts: [],
  pages: [],
  auditLogs: [],
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

export const fetchBanners = createAsyncThunk('cms/fetchBanners', async (_, { rejectWithValue }) => {
  try {
    const data = await cmsService.getBanners();
    return data.banners as Banner[];
  } catch {
    return rejectWithValue('Failed to fetch banners');
  }
});

export const createBanner = createAsyncThunk('cms/createBanner', async (payload: Partial<Banner>, { rejectWithValue }) => {
  try {
    const data = await cmsService.createBanner(payload);
    return data.banner as Banner;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.details || err.response?.data?.message || err.message || 'Failed to create banner';
    return rejectWithValue(msg);
  }
});

export const updateBanner = createAsyncThunk('cms/updateBanner', async ({ id, ...rest }: Partial<Banner> & { id: string }, { rejectWithValue }) => {
  try {
    const data = await cmsService.updateBanner(id, rest);
    return data.banner as Banner;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.details || err.response?.data?.message || err.message || 'Failed to update banner';
    return rejectWithValue(msg);
  }
});

export const removeBanner = createAsyncThunk('cms/removeBanner', async (id: string, { rejectWithValue }) => {
  try {
    await cmsService.deleteBanner(id);
    return id;
  } catch {
    return rejectWithValue('Failed to delete banner');
  }
});

export const fetchConfig = createAsyncThunk('cms/fetchConfig', async (_, { rejectWithValue }) => {
  try {
    const data = await cmsService.getConfig();
    return data.config as CmsConfig;
  } catch {
    return rejectWithValue('Failed to fetch config');
  }
});

export const saveConfig = createAsyncThunk('cms/saveConfig', async (payload: Partial<CmsConfig>, { rejectWithValue }) => {
  try {
    const data = await cmsService.updateConfig(payload);
    return data.config as CmsConfig;
  } catch {
    return rejectWithValue('Failed to save config');
  }
});

export const fetchAlerts = createAsyncThunk('cms/fetchAlerts', async (_, { rejectWithValue }) => {
  try {
    const data = await cmsService.getAlerts();
    return data.alerts as EmergencyAlert[];
  } catch {
    return rejectWithValue('Failed to fetch alerts');
  }
});

export const saveAlert = createAsyncThunk('cms/saveAlert', async (payload: Partial<EmergencyAlert>, { rejectWithValue }) => {
  try {
    const data = await cmsService.upsertAlert(payload);
    return data.alert as EmergencyAlert;
  } catch {
    return rejectWithValue('Failed to save alert');
  }
});

export const removeAlert = createAsyncThunk('cms/removeAlert', async (id: string, { rejectWithValue }) => {
  try {
    await cmsService.deleteAlert(id);
    return id;
  } catch {
    return rejectWithValue('Failed to delete alert');
  }
});

export const fetchPages = createAsyncThunk('cms/fetchPages', async (_, { rejectWithValue }) => {
  try {
    const data = await cmsService.getPages();
    return data.pages as CmsPage[];
  } catch {
    return rejectWithValue('Failed to fetch pages');
  }
});

export const savePage = createAsyncThunk('cms/savePage', async ({ slug, ...rest }: Partial<CmsPage> & { slug: string }, { rejectWithValue }) => {
  try {
    const data = await cmsService.updatePage(slug, rest);
    return data.page as CmsPage;
  } catch {
    return rejectWithValue('Failed to save page');
  }
});

export const fetchAuditLogs = createAsyncThunk('cms/fetchAuditLogs', async (_, { rejectWithValue }) => {
  try {
    const data = await cmsService.getAuditLogs();
    return data.logs as CmsAuditLog[];
  } catch {
    return rejectWithValue('Failed to fetch audit logs');
  }
});

const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    clearCmsMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    const startLoading = (state: CmsState) => { state.loading = true; state.error = null; };
    const startSaving = (state: CmsState) => { state.saving = true; state.error = null; };
    const stopLoading = (state: CmsState) => { state.loading = false; };
    const stopSaving = (state: CmsState) => { state.saving = false; };

    builder
      .addCase(fetchBanners.pending, startLoading)
      .addCase(fetchBanners.fulfilled, (state, action) => { stopLoading(state); state.banners = action.payload; })
      .addCase(fetchBanners.rejected, (state, action) => { stopLoading(state); state.error = action.payload as string; })

      .addCase(createBanner.pending, startSaving)
      .addCase(createBanner.fulfilled, (state, action) => { stopSaving(state); state.banners.push(action.payload); state.successMessage = 'Banner created'; })
      .addCase(createBanner.rejected, (state, action) => { stopSaving(state); state.error = action.payload as string; })

      .addCase(updateBanner.pending, startSaving)
      .addCase(updateBanner.fulfilled, (state, action) => {
        stopSaving(state);
        const idx = state.banners.findIndex(b => b.id === action.payload.id);
        if (idx !== -1) state.banners[idx] = action.payload;
        state.successMessage = 'Banner updated';
      })
      .addCase(updateBanner.rejected, (state, action) => { stopSaving(state); state.error = action.payload as string; })

      .addCase(removeBanner.fulfilled, (state, action) => { state.banners = state.banners.filter(b => b.id !== action.payload); state.successMessage = 'Banner deleted'; })
      .addCase(removeBanner.rejected, (state, action) => { state.error = action.payload as string; })

      .addCase(fetchConfig.pending, startLoading)
      .addCase(fetchConfig.fulfilled, (state, action) => { stopLoading(state); state.config = action.payload; })
      .addCase(fetchConfig.rejected, (state, action) => { stopLoading(state); state.error = action.payload as string; })

      .addCase(saveConfig.pending, startSaving)
      .addCase(saveConfig.fulfilled, (state, action) => { stopSaving(state); state.config = action.payload; state.successMessage = 'Configuration saved'; })
      .addCase(saveConfig.rejected, (state, action) => { stopSaving(state); state.error = action.payload as string; })

      .addCase(fetchAlerts.pending, startLoading)
      .addCase(fetchAlerts.fulfilled, (state, action) => { stopLoading(state); state.alerts = action.payload; })
      .addCase(fetchAlerts.rejected, (state, action) => { stopLoading(state); state.error = action.payload as string; })

      .addCase(saveAlert.pending, startSaving)
      .addCase(saveAlert.fulfilled, (state, action) => {
        stopSaving(state);
        const idx = state.alerts.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) state.alerts[idx] = action.payload;
        else state.alerts.unshift(action.payload);
        state.successMessage = 'Alert saved';
      })
      .addCase(saveAlert.rejected, (state, action) => { stopSaving(state); state.error = action.payload as string; })

      .addCase(removeAlert.fulfilled, (state, action) => { state.alerts = state.alerts.filter(a => a.id !== action.payload); state.successMessage = 'Alert removed'; })
      .addCase(removeAlert.rejected, (state, action) => { state.error = action.payload as string; })

      .addCase(fetchPages.pending, startLoading)
      .addCase(fetchPages.fulfilled, (state, action) => { stopLoading(state); state.pages = action.payload; })
      .addCase(fetchPages.rejected, (state, action) => { stopLoading(state); state.error = action.payload as string; })

      .addCase(savePage.pending, startSaving)
      .addCase(savePage.fulfilled, (state, action) => {
        stopSaving(state);
        const idx = state.pages.findIndex(p => p.slug === action.payload.slug);
        if (idx !== -1) state.pages[idx] = action.payload;
        state.successMessage = 'Page saved';
      })
      .addCase(savePage.rejected, (state, action) => { stopSaving(state); state.error = action.payload as string; })

      .addCase(fetchAuditLogs.fulfilled, (state, action) => { state.auditLogs = action.payload; })
      .addCase(fetchAuditLogs.rejected, (state, action) => { state.error = action.payload as string; });
  },
});

export const { clearCmsMessages } = cmsSlice.actions;
export default cmsSlice.reducer;
