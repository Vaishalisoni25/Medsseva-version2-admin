import React from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { switchContext } from '../redux/slices/authSlice';
import { MapPin, Building2, Check, Lock } from 'lucide-react';
import { cn } from '../utils/cn';

const CITIES = [
  { id: 'all', name: 'All Cities' },
  { id: 'dl', name: 'Delhi / NCR' },
  { id: 'mum', name: 'Mumbai' },
  { id: 'blr', name: 'Bengaluru' },
  { id: 'ind', name: 'Indore' }
];

const BRANCHES: Record<string, { id: string; name: string }[]> = {
  all: [{ id: 'all', name: 'All Branches' }],
  dl: [
    { id: 'all', name: 'All Branches' },
    { id: 'dl-west', name: 'West Delhi Accession Hub' },
    { id: 'dl-ggn', name: 'Gurugram Processing Centre' }
  ],
  mum: [
    { id: 'all', name: 'All Branches' },
    { id: 'mum-c', name: 'Mumbai Central Lab' },
    { id: 'mum-and', name: 'Andheri Suburban Node' }
  ],
  blr: [
    { id: 'all', name: 'All Branches' },
    { id: 'blr-wf', name: 'Whitefield Advanced Lab' }
  ],
  ind: [
    { id: 'all', name: 'All Branches' },
    { id: 'ind-vn', name: 'Vijay Nagar Accession Centre' },
    { id: 'ind-c', name: 'Indore Central Lab' }
  ]
};

export const GlobalContextBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentCityId, currentBranchId, user } = useAppSelector(state => state.auth);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN' || (user as any)?.isSuperAdmin;
  const isRestricted = !isSuperAdmin;

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(switchContext({ cityId: e.target.value }));
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(switchContext({ branchId: e.target.value }));
  };

  const currentCityName = CITIES.find(c => c.id === currentCityId)?.name || 'All Cities';
  const availableBranches = BRANCHES[currentCityId] || BRANCHES['all'];

  return (
    <div className="bg-[#004B4D] border-t border-[#006D6F]/50 text-white/90 text-[10px] px-6 py-2 flex flex-col md:flex-row items-start md:items-center gap-4 select-none">
      <div className="flex items-center gap-1 text-[#5eead4] font-black tracking-wider uppercase shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4] animate-pulse mr-1" />
        Operational Branch Context:
      </div>

      <div className="flex flex-wrap gap-4 flex-1 items-center">
        {/* City Context */}
        <div className={cn(
          "flex items-center gap-1.5 bg-black/20 border border-white/10 px-2 py-0.5 rounded-md hover:border-[#5eead4]/40 transition-colors",
          isRestricted && "hover:border-white/10 bg-black/40 opacity-75"
        )}>
          <MapPin className="h-3 w-3 text-[#5eead4]" />
          <select 
            value={currentCityId}
            onChange={handleCityChange}
            disabled={isRestricted}
            className={cn(
              "bg-transparent border-none outline-none text-white font-bold text-[10px] pr-1 outline-none",
              isRestricted ? "cursor-not-allowed" : "cursor-pointer"
            )}
          >
            {CITIES.map(c => (
              <option key={c.id} value={c.id} className="text-slate-800 font-bold bg-white">{c.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Context */}
        <div className={cn(
          "flex items-center gap-1.5 bg-black/20 border border-white/10 px-2 py-0.5 rounded-md hover:border-[#5eead4]/40 transition-colors",
          isRestricted && "hover:border-white/10 bg-black/40 opacity-75"
        )}>
          <Building2 className="h-3 w-3 text-[#5eead4]" />
          <select 
            value={currentBranchId}
            onChange={handleBranchChange}
            disabled={isRestricted}
            className={cn(
              "bg-transparent border-none outline-none text-white font-bold text-[10px] pr-1 outline-none",
              isRestricted ? "cursor-not-allowed" : "cursor-pointer"
            )}
          >
            {availableBranches.map(b => (
              <option key={b.id} value={b.id} className="text-slate-800 font-bold bg-white">{b.name}</option>
            ))}
          </select>
        </div>

        <div className="md:ml-auto flex items-center gap-2 opacity-80 text-[9px]">
          {isRestricted ? (
          <div className="flex items-center gap-1 bg-amber-950 border border-amber-900 text-amber-400 font-black uppercase px-2 py-0.5 rounded-full select-none">
              <Lock className="h-2.5 w-2.5" /> Branch-Restricted
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-950 border border-emerald-900 text-emerald-400 font-black uppercase px-2 py-0.5 rounded-full">
              <Check className="h-2.5 w-2.5" /> {currentCityName} Dashboard Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
