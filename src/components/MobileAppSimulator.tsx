import React from 'react';
import { useAppSelector } from '../redux/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Bell,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Droplets,
  Clock,
  MessageCircle,
  CreditCard,
  TrendingUp,
  Grid,
  Calendar,
  Heart,
  User,
  Signal,
  Battery,
  Plus,
  Activity,
  Candy,
  Brain,
  HeartPulse
} from 'lucide-react';
import { cn } from '../utils/cn';

export const MobileAppSimulator: React.FC = () => {
const { config, banners } = useAppSelector(state => state.cms);

  const appConfig = {
    primaryColor: '#006D6F',
    layoutSections: config?.layoutSections ?? [],
    categoriesPriority: config?.categoryOrder ?? [],
    featureToggles: {
      enableReportsWallet: config?.featureFlags?.enableReportsWallet ?? false,
      enableAiSymptomsChat: config?.featureFlags?.enableAiSymptomsChat ?? false,
    },
    emergencyAlert: (() => {
      return { isActive: false, title: '', message: '', type: 'info' };
    })(),
    healthTips: [] as { id: string; title: string; description: string; icon: string }[],
  };
  const { packages } = useAppSelector(state => state.tests);

  const activeHeroBanners = banners.filter(b => b.isActive && b.bannerType !== 'PROMO');
  const activePromoBanners = banners.filter(b => b.isActive && b.bannerType === 'PROMO');
  const sevaCheckPackages = packages.filter(p => p.isSevaCheck || p.discountedPrice && p.discountedPrice > 1000);


  const getTipIcon = (iconName: string) => {
    switch (iconName) {
      case 'droplet': return <Droplets className="h-4 w-4 text-sky-500" />;
      case 'clock': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <Heart className="h-4 w-4 text-rose-500" />;
    }
  };

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'hero_banner':
        return (
          <div className="px-4 py-2 space-y-2.5" key="hero_banner">
            {/* Hero Top Banner */}
            <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 shadow-sm">
              {activeHeroBanners.length > 0 ? (
                <motion.div 
                  key={activeHeroBanners[0].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activeHeroBanners[0].imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2.5">
                    <div>
                      <div className="bg-teal-600/90 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded w-max mb-0.5">
                        Hero Banner
                      </div>
                      <h4 className="text-[11px] font-black text-white leading-tight tracking-tight truncate w-52">
                        {activeHeroBanners[0].title}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-slate-400 italic">
                  No active hero banner
                </div>
              )}
           
              <div className="absolute bottom-2 right-2 flex gap-1">
                {activeHeroBanners.map((_, i) => (
                  <div key={i} className={cn("h-1 w-1 rounded-full", i === 0 ? "bg-white" : "bg-white/50")} />
                ))}
              </div>
            </div>

            {/* Promo Banner Preview */}
            <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-amber-50/50 border border-amber-200/60 shadow-sm">
              {activePromoBanners.length > 0 ? (
                <motion.div 
                  key={activePromoBanners[0].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activePromoBanners[0].imageUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <div>
                      <div className="bg-amber-500/90 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded w-max mb-0.5">
                        Promo Banner
                      </div>
                      <h4 className="text-[10px] font-black text-white leading-tight tracking-tight truncate w-52">
                        {activePromoBanners[0].title}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[9px] text-amber-700/70">
                  <span className="font-bold">Static Promo Fallback</span>
                  <span className="text-[8px] text-slate-400">Upload Promo Banner to replace</span>
                </div>
              )}

              <div className="absolute bottom-1.5 right-2 flex gap-1">
                {(activePromoBanners.length > 0 ? activePromoBanners : [1, 2, 3, 4]).map((_, i) => (
                  <div key={i} className={cn("h-1 w-1 rounded-full", i === 0 ? "bg-amber-500" : "bg-slate-300")} />
                ))}
              </div>
            </div>
          </div>
        );

      case 'quick_categories':
        return (
          <div className="px-4 py-2" key="quick_categories">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Popular Scans</h3>
              <button className="text-[9px] font-extrabold text-primary flex items-center">View All</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {appConfig.categoriesPriority.map((cat, idx) => (
                <motion.div
                  key={cat}
                  layoutId={`cat-${cat}`}
                  className="bg-white border border-slate-100 rounded-xl p-2 shadow-sm flex flex-col items-center text-center group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center mb-1.5 border border-slate-100">
  {idx === 0 ? (
    <Droplets className="h-4 w-4 text-red-500" />
  ) : idx === 1 ? (
    <Candy className="h-4 w-4 text-amber-500" />
  ) : idx === 2 ? (
    <Brain className="h-4 w-4 text-violet-500" />
  ) : (
    <HeartPulse className="h-4 w-4 text-rose-500" />
  )}
</div>
                  <span className="text-[9px] font-black text-slate-700 leading-tight truncate w-full">{cat}</span>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'seva_check':
        return (
          <div className="px-4 py-3 bg-primary/5 my-2 border-y border-primary/10" key="seva_check">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <h3 className="text-[11px] font-black text-[#004B4D] uppercase tracking-wider">SevaCheck Premium</h3>
              </div>
              <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-600 uppercase">
                Best Value
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {sevaCheckPackages.length > 0 ? (
                sevaCheckPackages.map(pkg => (
                  <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-3 min-w-[160px] max-w-[160px] shadow-sm shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-teal-600 text-white text-[7px] px-1.5 py-0.5 rounded-bl font-bold">Popular</div>
                    <h4 className="text-[10px] font-black text-slate-800 leading-tight mt-1 truncate">{pkg.name}</h4>
                    <p className="text-[8px] text-slate-500 mt-0.5 line-clamp-2 h-5">{pkg.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                      <div>
                        <div className="text-[7px] text-slate-400 line-through">₹{pkg.price}</div>
                        <div className="text-xs font-extrabold text-teal-700 leading-none">₹{pkg.discountedPrice || pkg.price}</div>
                      </div>
                      <button className="bg-[#006D6F] text-white text-[8px] font-black px-2 py-1 rounded">Book</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[9px] text-slate-500 italic">No premium packages mapped.</div>
              )}
            </div>
          </div>
        );

      case 'trending_packages':
        return (
          <div className="px-4 py-2" key="trending_packages">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Trending Packages
              </h3>
            </div>
            <div className="space-y-2">
              {packages.slice(0, 2).map(pkg => (
                <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex justify-between items-center">
                  <div className="flex-1 truncate mr-3">
                    <h4 className="text-[10px] font-bold text-slate-800 truncate">{pkg.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Home Delivery</span>
                      <span className="text-[8px] text-emerald-600 font-bold">Save ₹{(pkg.price || 0) - (pkg.discountedPrice || 0)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-800">₹{pkg.discountedPrice || pkg.price}</div>
                    <button className="text-[9px] font-black text-primary mt-0.5 uppercase tracking-tight flex items-center gap-0.5">
                      Add <ArrowRight className="h-2 w-2" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'ai_health_tips':
        return (
          <div className="px-4 py-3" key="ai_health_tips">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
              <h3 className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">MedsSeva AI Insights</h3>
            </div>
            <div className="space-y-2">
              {appConfig.healthTips.map(tip => (
                <div key={tip.id} className="bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100 rounded-xl p-3 flex gap-2.5 shadow-sm">
                  <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center border border-emerald-200 shrink-0">
                    {getTipIcon(tip.icon)}
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black text-emerald-950 leading-tight">{tip.title}</h4>
                    <p className="text-[8px] text-emerald-800 leading-normal mt-0.5 italic">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center p-4 select-none">
      <div 
        className="relative w-[280px] h-[560px] bg-slate-50 rounded-[40px] overflow-hidden border-[8px] border-slate-950 shadow-2xl ring-4 ring-slate-200 flex flex-col"
        style={{ '--tw-primary': appConfig.primaryColor } as React.CSSProperties}
      >
        
   
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 z-50 flex justify-between px-6 pt-1 items-center text-[9px] font-bold text-white">
          <div>9:41</div>
          <div className="w-24 h-4.5 bg-slate-950 rounded-b-2xl absolute left-1/2 -translate-x-1/2 top-0 flex items-center justify-center">
            <div className="h-1 w-8 bg-slate-800 rounded-full mt-1" />
          </div>
         <div className="flex items-center gap-1">
            <Signal className="h-3 w-3 text-white" />
            <Battery className="h-3 w-3 text-white" />
          </div>
        </div>

       
        <div className="pt-7 bg-white border-b border-slate-100 shrink-0 shadow-sm">
       
          <div className="px-4 py-2 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary fill-primary/20" />
              <div>
                <div className="text-[7px] text-slate-400 font-bold leading-none">Delivering to</div>
                <div className="text-[10px] font-black text-slate-800 leading-tight flex items-center gap-0.5">
                  Gurugram Sec 15 <span className="text-[7px]">▼</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {appConfig.featureToggles.enableReportsWallet && (
                <button className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 relative">
                  <CreditCard className="h-3.5 w-3.5 text-slate-600" />
                </button>
              )}
              <button className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 relative">
                <Bell className="h-3.5 w-3.5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-rose-500 rounded-full" />
              </button>
            </div>
          </div>

      
          <div className="px-4 pb-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl h-8 px-3 flex items-center gap-2 text-slate-400">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[9px] font-medium">Search 3000+ tests & packages...</span>
            </div>
          </div>

    
          <AnimatePresence>
            {appConfig.emergencyAlert.isActive && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  "px-4 py-1.5 text-white text-[8px] leading-tight flex items-start gap-1.5 shadow-inner",
                  appConfig.emergencyAlert.type === 'critical' ? 'bg-rose-600' : 'bg-amber-600'
                )}
              >
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">{appConfig.emergencyAlert.title}: </span>
                  {appConfig.emergencyAlert.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

    
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] pb-12 scrollbar-none">
          {appConfig.layoutSections.map(section => renderSection(section))}
        </div>


        <AnimatePresence>
          {appConfig.featureToggles.enableAiSymptomsChat && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-16 right-4 h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-500 text-white flex items-center justify-center shadow-lg cursor-pointer border border-emerald-400 z-40 animate-bounce"
            >
              <MessageCircle className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>

      
        <div className="absolute bottom-0 inset-x-0 h-12 bg-white border-t border-slate-100 flex justify-around items-center px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] z-40">
          <div className="flex flex-col items-center cursor-pointer text-primary">
            <Grid className="h-4 w-4" />
            <span className="text-[8px] font-black mt-0.5">Home</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer text-slate-400 hover:text-slate-600">
            <Calendar className="h-4 w-4" />
            <span className="text-[8px] font-bold mt-0.5">Bookings</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer text-slate-400 hover:text-slate-600">
         <div className="h-8 w-8 bg-[#006D6F] rounded-full -mt-6 shadow-md flex items-center justify-center border-4 border-white text-white">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-[8px] font-black mt-0.5 text-primary">Upload</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer text-slate-400 hover:text-slate-600">
            <Heart className="h-4 w-4" />
            <span className="text-[8px] font-bold mt-0.5">Health Tracker</span>
          </div>
          <div className="flex flex-col items-center cursor-pointer text-slate-400 hover:text-slate-600">
            <User className="h-4 w-4" />
            <span className="text-[8px] font-bold mt-0.5">Profile</span>
          </div>
        </div>

   
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-20 bg-slate-300 rounded-full z-50" />

      </div>
    </div>
  );
};


