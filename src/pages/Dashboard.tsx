import React, { useState, useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { useBookingsQuery } from '@/hooks/useAdminQueries';
import { 
  TrendingUp, 
  Calendar, 
  FileCheck2, 
  AlertCircle, 
  ChevronRight, 
  Activity,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';
type ChartView = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
];

export const DashboardPage: React.FC = () => {
  const { user, currentCityId, currentBranchId } = useAppSelector(state => state.auth);
  const { bookings } = useAppSelector(state => state.bookings);
  const { isLoading: bookingsLoading, refetch } = useBookingsQuery();
  const isLoading = bookingsLoading && bookings.length === 0;

  const [preset, setPreset] = useState<Preset>('last7');
  const [chartView, setChartView] = useState<ChartView>('weekly');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Base role and branch filtered bookings
  const baseBookings = useMemo(() => {
    const isSuper = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN' || (user as any)?.isSuperAdmin;
    const userBranchId = (user as any)?.branchId;

    return bookings.filter(b => {
      if (user?.role === 'franchise_admin') {
        if (b.franchiseId !== user.franchiseId) return false;
      }
      if (user?.role === 'phlebotomist') {
        if (b.phlebotomistId !== user.id) return false;
      }
      // Branch & Partner-scoped lock for Branch Admins / Lab Partners ONLY
      const userPartnerId = (user as any)?.partner?.id || (user as any)?.partnerId;
      const bPartnerId = (b as any).assignedPartnerId;
      if (!isSuper && userBranchId) {
        const matchesThisBranch = (b.branchId && b.branchId === userBranchId) || 
                                  (userPartnerId && bPartnerId && bPartnerId === userPartnerId);
        if (!matchesThisBranch) return false;
      }
      // Super admin sees all, unless explicit manual city/branch filter selected
      if (!isSuper && currentCityId && currentCityId !== 'all') {
        if (b.cityId !== currentCityId) return false;
      }
      if (!isSuper && currentBranchId && currentBranchId !== 'all') {
        const matchesCurrentBranch = (b.branchId && b.branchId === currentBranchId) ||
                                     (userPartnerId && bPartnerId && bPartnerId === userPartnerId);
        if (!matchesCurrentBranch) return false;
      }
      return true;
    });
  }, [bookings, user, currentCityId, currentBranchId]);

  // Robust date parser for all date string formats (ISO, DD/MM/YYYY, YYYY-MM-DD)
  const parseBookingDate = (b: any): Date => {
    const raw = b.scheduledDate || (b as any).createdAt || b.bookingDate;
    if (!raw) return new Date();
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    if (typeof raw === 'string') {
      const parts = raw.split(/[\/\-\.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (parts[2].length === 4) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    return new Date();
  };

  // Time preset date range computation
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    switch (preset) {
      case 'today':
        return { start: startOfToday, end: endOfToday };
      case 'yesterday': {
        const startOfYest = new Date(startOfToday);
        startOfYest.setDate(startOfYest.getDate() - 1);
        const endOfYest = new Date(endOfToday);
        endOfYest.setDate(endOfYest.getDate() - 1);
        return { start: startOfYest, end: endOfYest };
      }
      case 'last7': {
        const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        return { start: start7, end: endOfMonth };
      }
      case 'last30': {
        const start30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        return { start: start30, end: endOfMonth };
      }
      case 'thisMonth': {
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { start: startMonth, end: endOfMonth };
      }
      case 'lastMonth': {
        const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start: startLastMonth, end: endLastMonth };
      }
      default:
        return { start: startOfToday, end: endOfMonth };
    }
  }, [preset]);

  // Filtered Bookings for the selected Preset
  const filteredBookings = useMemo(() => {
    return baseBookings.filter(b => {
      const bDate = parseBookingDate(b);
      return bDate >= dateRange.start && bDate <= dateRange.end;
    });
  }, [baseBookings, dateRange]);

  // KPI Calculations
  const totalRevenue = useMemo(() => {
    return filteredBookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  }, [filteredBookings]);

  const totalBookingsCount = filteredBookings.length;

  const completedCount = useMemo(() => {
    return filteredBookings.filter(b => b.status === 'Completed' || b.status === 'Approved').length;
  }, [filteredBookings]);

  const completionRate = totalBookingsCount > 0 
    ? Math.round((completedCount / totalBookingsCount) * 100) 
    : 100;

  const pendingCount = useMemo(() => {
    return filteredBookings.filter(b => b.status === 'Pending' || b.status === 'Assigned' || b.status === 'Processing').length;
  }, [filteredBookings]);

  // Dynamic Spline Aggregator based on chartView
  const revenueChartData = useMemo(() => {
    if (chartView === 'daily') {
      // 2-hour interval time slots for Day view
      const slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const slotMap: Record<string, { bookings: number; revenue: number }> = {};
      slots.forEach(s => { slotMap[s] = { bookings: 0, revenue: 0 }; });

      filteredBookings.forEach(b => {
        const d = parseBookingDate(b);
        const hour = d.getHours();
        let matchedSlot = '08:00';
        if (hour >= 21) matchedSlot = '22:00';
        else if (hour >= 19) matchedSlot = '20:00';
        else if (hour >= 17) matchedSlot = '18:00';
        else if (hour >= 15) matchedSlot = '16:00';
        else if (hour >= 13) matchedSlot = '14:00';
        else if (hour >= 11) matchedSlot = '12:00';
        else if (hour >= 9) matchedSlot = '10:00';

        if (slotMap[matchedSlot]) {
          slotMap[matchedSlot].bookings += 1;
          slotMap[matchedSlot].revenue += b.totalAmount || (b as any).totalPaid || 0;
        }
      });

      return slots.map(s => ({
        name: s,
        bookings: slotMap[s].bookings,
        revenue: slotMap[s].revenue,
      }));
    } else if (chartView === 'monthly') {
      // 4 Weeks aggregator
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weekMap: Record<string, { bookings: number; revenue: number }> = {
        'Week 1': { bookings: 0, revenue: 0 },
        'Week 2': { bookings: 0, revenue: 0 },
        'Week 3': { bookings: 0, revenue: 0 },
        'Week 4': { bookings: 0, revenue: 0 },
      };

      filteredBookings.forEach(b => {
        const d = parseBookingDate(b);
        const day = d.getDate();
        let w = 'Week 1';
        if (day > 21) w = 'Week 4';
        else if (day > 14) w = 'Week 3';
        else if (day > 7) w = 'Week 2';

        weekMap[w].bookings += 1;
        weekMap[w].revenue += b.totalAmount || (b as any).totalPaid || 0;
      });

      return weeks.map(w => ({
        name: w,
        bookings: weekMap[w].bookings,
        revenue: weekMap[w].revenue,
      }));
    } else if (chartView === 'yearly') {
      // 12 Months aggregator
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthMap: Record<string, { bookings: number; revenue: number }> = {};
      months.forEach(m => { monthMap[m] = { bookings: 0, revenue: 0 }; });

      baseBookings.forEach(b => {
        const d = parseBookingDate(b);
        const mName = months[d.getMonth()];
        if (monthMap[mName]) {
          monthMap[mName].bookings += 1;
          monthMap[mName].revenue += b.totalAmount || (b as any).totalPaid || 0;
        }
      });

      return months.map(m => ({
        name: m,
        bookings: monthMap[m].bookings,
        revenue: monthMap[m].revenue,
      }));
    } else {
      // Default: Weekly Days aggregator
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chartDataMap: Record<string, { bookings: number; revenue: number }> = {
        'Mon': { bookings: 0, revenue: 0 },
        'Tue': { bookings: 0, revenue: 0 },
        'Wed': { bookings: 0, revenue: 0 },
        'Thu': { bookings: 0, revenue: 0 },
        'Fri': { bookings: 0, revenue: 0 },
        'Sat': { bookings: 0, revenue: 0 },
        'Sun': { bookings: 0, revenue: 0 },
      };

      filteredBookings.forEach(b => {
        const date = parseBookingDate(b);
        const dayName = daysOfWeek[date.getDay()];
        if (chartDataMap[dayName]) {
          chartDataMap[dayName].bookings += 1;
          chartDataMap[dayName].revenue += b.totalAmount || (b as any).totalPaid || 0;
        }
      });

      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        name: day,
        bookings: chartDataMap[day].bookings,
        revenue: chartDataMap[day].revenue,
      }));
    }
  }, [filteredBookings, baseBookings, chartView]);

  // Dynamic Category Distribution
  const categoryDistribution = useMemo(() => {
    const categoryCounts: Record<string, number> = {
      'Blood': 0,
      'Diabetes': 0,
      'Cardiac': 0,
      'Thyroid': 0,
    };

    filteredBookings.forEach(b => {
      (b.tests || []).forEach(t => {
        const cat = t.category || 'Blood';
        if (categoryCounts[cat] !== undefined) {
          categoryCounts[cat] += 1;
        } else {
          categoryCounts[cat] = 1;
        }
      });
    });

    const colors = ['#0F766E', '#0D9488', '#14B8A6', '#2DD4BF', '#059669', '#34D399'];
    return Object.keys(categoryCounts).map((cat, idx) => ({
      name: cat,
      count: categoryCounts[cat] || 0,
      color: colors[idx % colors.length]
    }));
  }, [filteredBookings]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const renderRoleHeader = () => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Global SaaS Platform Analytics',
      admin: 'Branch Operations & Staff Overview',
      branchadmin: 'Branch Operations & Staff Overview',
      franchise_admin: 'Franchise Performance & Invoices',
      lab_staff: 'Central Laboratory Workspace Queue',
      doctor: 'Clinical Review & Approvals',
      phlebotomist: 'Today\'s Home Collection Route',
      technician: 'Pathology Lab Testing Desk'
    };

    const presetLabels: Record<Preset, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      last7: 'Last 7 Days',
      last30: 'Last 30 Days',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
    };

    return (
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary select-none mb-2 sm:mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Operations Sync Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {roleLabels[user?.role || 'super_admin'] || 'Healthcare Management Console'}, Ready for clinical workflow.
          </p>
        </div>

        {/* Time Range Filter Bar (Matching Analytics Page) */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto w-full xl:w-auto">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 shadow-sm flex-wrap gap-1 w-full sm:w-auto">
            {PRESETS.map((p) => {
              const active = preset === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex-1 sm:flex-none text-center',
                    active
                      ? 'bg-card text-foreground font-bold shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shadow-sm disabled:opacity-50 shrink-0"
            title="Refresh dashboard"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>
    );
  };

  const renderStatsWidgets = () => {
    const isSuper = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN' || (user as any)?.isSuperAdmin;
    const isLab = user?.role === 'lab_staff' || user?.role === 'technician';

    const presetSuffix: Record<Preset, string> = {
      today: 'vs yesterday',
      yesterday: 'vs previous day',
      last7: 'vs last 7 days',
      last30: 'vs last 30 days',
      thisMonth: 'vs last month',
      lastMonth: 'vs previous month',
    };

    const stats = [
      {
        title: isSuper ? 'Global Platform Revenue' : isLab ? 'Awaiting Sample' : 'Branch Revenue',
        value: `₹${totalRevenue.toLocaleString()}`,
        change: totalRevenue > 0 ? '+14.2%' : '0.0%',
        icon: isSuper ? ShoppingBag : Calendar,
        trend: totalRevenue > 0 ? 'up' : 'down'
      },
      {
        title: isSuper ? 'Global Bookings' : isLab ? 'Ready for Test' : 'Total Cases',
        value: `${totalBookingsCount} Bookings`,
        change: totalBookingsCount > 0 ? '+28.4%' : '0.0%',
        icon: TrendingUp,
        trend: totalBookingsCount > 0 ? 'up' : 'down'
      },
      {
        title: isLab ? 'Under QC Check' : 'Reports Delivered',
        value: isLab ? `${filteredBookings.filter(b => b.status === 'Under QC').length} Reports` : `${completionRate}% (${completedCount} Cases)`,
        change: completedCount > 0 ? '+3.1%' : '0.0%',
        icon: FileCheck2,
        trend: completedCount > 0 ? 'up' : 'down'
      },
      {
        title: 'Pending Cases',
        value: `${pendingCount} Active`,
        change: pendingCount > 0 ? '+15.0%' : '0.0%',
        icon: AlertCircle,
        trend: pendingCount > 0 ? 'up' : 'down'
      }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3.5">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{stat.title}</span>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
                <span className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md", 
                  stat.trend === 'up' ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground bg-muted"
                )}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {stat.change}
                </span>
                <span className="text-muted-foreground">{presetSuffix[preset]}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      
      {/* Page Header with Time Range Preset Selector */}
      {renderRoleHeader()}

      {/* Analytical Counters Row */}
      {renderStatsWidgets()}

      {/* Graphical Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        
        {/* Recharts Spline Overlay - Bookings & Revenue */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col h-[340px] sm:h-[400px] min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Diagnostics Volume Tracker</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Interactive test metrics & revenue analytics</p>
            </div>
            
            {/* Chart View Dropdown (Supports Day / Week / Month / Year) */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">View Mode:</label>
              <select 
                value={chartView}
                onChange={e => setChartView(e.target.value as ChartView)}
                className="bg-muted/70 border border-border/60 rounded-xl text-xs font-semibold text-foreground px-2.5 sm:px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="daily">Daily / Today (Hours)</option>
                <option value="weekly">Weekly View (Days)</option>
                <option value="monthly">Monthly View (Weeks)</option>
                <option value="yearly">Yearly View (Months)</option>
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECEF" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#667085', fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#667085', fontWeight: 500 }} 
                />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  labelStyle={{ fontWeight: 600, color: '#1A1A1A' }}
                  formatter={(value: any, name: any) => [
                    name === 'revenue' ? `₹${Number(value).toLocaleString()}` : `${value} Bookings`,
                    name === 'revenue' ? 'Revenue' : 'Bookings'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recharts Distribution Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col h-[340px] sm:h-[400px] min-w-0"
        >
          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-bold text-foreground">Test Department Split</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution by medical category</p>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#667085', fontWeight: 500 }} 
                  width={75}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} 
                  formatter={(value: any) => [`${value} Tests`, 'Volume']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

      {/* Operations Split: Recent Bookings & Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Recent Bookings Ingress Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-bold text-foreground">Recent Booking Ingress</h3>
            <span className="text-xs text-muted-foreground">
              Showing {Math.min(filteredBookings.length, 5)} of {filteredBookings.length} cases
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left text-sm font-medium select-none min-w-[500px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 font-bold">Patient</th>
                  <th className="pb-3 font-bold">Tests Ordered</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 text-right font-bold">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                {filteredBookings.slice(0, 5).map((book) => {
                  const testNames = [
                    ...(book.tests || []).map(t => t.code || t.name),
                    ...(book.packages || []).map(p => p.code || p.name)
                  ].join(', ') || 'Diagnostic Test';

                  const statusColors: Record<string, string> = {
                    Pending: 'bg-warning/10 text-warning border-warning/20',
                    Confirmed: 'bg-primary/10 text-primary border-primary/20',
                    Assigned: 'bg-teal-600/10 text-teal-700 border-teal-600/20',
                    Collected: 'bg-cyan-600/10 text-cyan-700 border-cyan-600/20',
                    Processing: 'bg-indigo-600/10 text-indigo-700 border-indigo-600/20',
                    Completed: 'bg-success/10 text-success border-success/20',
                    Approved: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20',
                  };

                  return (
                    <tr key={book.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3.5 pr-3">
                        <p className="font-bold text-sm tracking-tight text-foreground">{book.patient?.name || 'Patient'}</p>
                        <p className="text-xs text-muted-foreground tracking-wide mt-0.5">Code: {book.bookingCode || book.id.slice(0, 8)}</p>
                      </td>
                      <td className="py-3.5 pr-3 text-muted-foreground text-xs max-w-[150px] truncate">
                        {testNames}
                      </td>
                      <td className="py-3.5 pr-3">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border tracking-wider leading-none",
                          statusColors[book.status] || "bg-muted text-muted-foreground border-border"
                        )}>
                          {book.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-sm">
                        ₹{book.totalAmount || 0}
                      </td>
                    </tr>
                  );
                })}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs">
                      No bookings recorded for this selected time period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Notification Feed Panel */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              Live System Operations
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
            {[
              { time: '2 mins ago', text: 'Sample Collected for LMS-583910 (CBC)', tag: 'Phlebotomy' },
              { time: '10 mins ago', text: 'Dr. Shalini Approved Thyroid Report #THY-03', tag: 'Clinical' },
              { time: '45 mins ago', text: 'Critical Value Alert (HbA1c) flagged for patient Suresh', tag: 'Security', alert: true },
              { time: '1 hr ago', text: 'New Online Booking LMS-849204 initiated', tag: 'Revenue' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 select-none">
                <span className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  activity.alert ? "bg-destructive" : "bg-primary/60"
                )} />
                <div className="flex-1">
                  <p className={cn("text-xs leading-relaxed font-medium", activity.alert ? "text-destructive font-bold" : "text-foreground")}>
                    {activity.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>{activity.tag}</span>
                    <span>•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

// Standard Premium Skeleton Container Layout
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="h-8 bg-muted/70 rounded-lg w-48 mb-2" />
      <div className="h-4 bg-muted/40 rounded-lg w-72 mb-8" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-muted/30 rounded-2xl border border-border" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 h-[400px] bg-muted/30 rounded-2xl border border-border" />
        <div className="h-[400px] bg-muted/30 rounded-2xl border border-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[240px] bg-muted/30 rounded-2xl border border-border" />
        <div className="h-[240px] bg-muted/30 rounded-2xl border border-border" />
      </div>
    </div>
  );
};
