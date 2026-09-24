import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { loginStart, loginSuccess, loginFailure } from '@/redux/slices/authSlice';
import { API_URL } from '@/services/api';

import { HeartPulse, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error } = useAppSelector(state => state.auth);



const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLocalLoading(true);
    dispatch(loginStart());

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        dispatch(loginFailure(data.error || 'Login failed'));
        setIsLocalLoading(false);
        return;
      }

      const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE', 'LAB_DEPARTMENT', 'PATHOLOGIST', 'PATHOLOGY_PARTNER'];
      if (!allowedRoles.includes(data.user.role)) {
        dispatch(loginFailure('Access denied. Phlebotomists operate via the Mobile App and cannot access this Admin Panel.'));
        setIsLocalLoading(false);
        return;
      }

      localStorage.setItem('medsseva_token', data.token);
      dispatch(loginSuccess({
        user: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || '',
          role: data.user.role,
          status: 'active',
          phone: data.user.mobile,
          adminRole: data.user.adminRole || null,
          adminRoleSlug: data.user.adminRoleSlug || null,
          permissions: data.user.permissions || [],
          accessibleModules: data.user.accessibleModules || [],
          branchId: data.user.branchId || null,
          branchName: data.user.branchName || null,
        },
        token: data.token,
      }));
      setIsLocalLoading(false);
      navigate('/');
    } catch (err) {
      dispatch(loginFailure('Cannot reach server. Check your network.'));
      setIsLocalLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background flex selection:bg-primary/20">
      
   
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-[#004B4D] to-[#006D6F] relative overflow-hidden items-center justify-center p-12">
        
        {/* Background graphic accents */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-48 -right-12 w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-3xl" />
        
        <div className="relative z-10 max-w-md text-white">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-8 shadow-lg">
            <HeartPulse className="w-5 h-5 text-teal-300 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase">MedsSeva Cloud Platform</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
            Smart Diagnostic & <br />
            <span className="text-teal-300">Lab Operations SaaS</span>
          </h1>
          
          <p className="text-teal-50/80 text-base mb-10 leading-relaxed">
            Real-time diagnostics reporting, role-based pathology tracking, phlebotomy route management and unified CMS dashboard designed for enterprise clinical ecosystems.
          </p>
          
          <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10 text-sm font-medium">
            <div>
              <h4 className="text-xl text-white font-bold">6+ Roles</h4>
              <p className="text-teal-200/70 text-xs font-normal mt-1">Isolated access control matrix</p>
            </div>
            <div>
              <h4 className="text-xl text-white font-bold">ISO Certified</h4>
              <p className="text-teal-200/70 text-xs font-normal mt-1">Simulated Pathology QC compliance</p>
            </div>
          </div>
        </div>
      </div>

   
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-20 xl:px-32 py-12 bg-background">
        
        <div className="max-w-md w-full mx-auto space-y-8">
          
          {/* Header Text */}
          <div className="text-center lg:text-left">
            <div className="lg:hidden bg-primary/10 text-primary w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-md mb-4">
              <HeartPulse className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome Administrator</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to explore the multi-role healthcare management console
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-xl p-3.5 text-xs font-medium text-destructive text-center flex items-center gap-2 justify-center"
            >
              <span className="bg-destructive text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">!</span>
              {error}
            </motion.div>
          )}

          {/* Credentials Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-wide pl-0.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., admin@lms.com"
                  required
                  className="w-full h-11 bg-card border border-border rounded-xl pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/80 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-wide pl-0.5">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full h-11 bg-card border border-border rounded-xl pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/80 transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocalLoading}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
            >
              {isLocalLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Enter Dashboard Console</span>
              )}
            </button>
          </form>

   

        </div>
      </div>
    </div>
  );
};
