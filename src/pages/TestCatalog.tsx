import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { deleteTest, addTest, updateTest } from '@/redux/slices/testSlice';
import { useTestsQuery } from '@/hooks/useAdminQueries';
import { MedicalTest, TestCategory, TestParameter } from '@/types';
import toast from 'react-hot-toast';
import {
  Search,
  Plus,
  Filter,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  FlaskConical,
  Clock,
  Info,
  Zap,
  PencilLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

const CATEGORIES: TestCategory[] = ['Blood', 'Diabetes', 'Thyroid', 'Cardiac', 'Liver', 'Vitamins', 'Fever', 'General', 'Full Body'];

export const TestCatalogPage: React.FC = () => {
const { tests, status, error } = useAppSelector(state => state.tests);
  const dispatch = useAppDispatch();

const { isLoading: testsLoading } = useTestsQuery();

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<TestCategory | 'All'>('All');

  // Drawer/Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<MedicalTest | null>(null);

  // Form Local State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCat, setFormCat] = useState<TestCategory>('Blood');
  const [formPrice, setFormPrice] = useState(0);
  const [formDiscPrice, setFormDiscPrice] = useState<number | undefined>(undefined);
  const [formDesc, setFormDesc] = useState('');
  const [formFasting, setFormFasting] = useState(false);
  const [formTime, setFormTime] = useState(24);
  const [formSample, setFormSample] = useState('');
  
const [formParameters, setFormParameters] = useState<TestParameter[]>([]);
  const [paramName, setParamName] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramDesc, setParamDesc] = useState('');
  const [editingParamId, setEditingParamId] = useState<string | null>(null);

  const [rangeGender, setRangeGender] = useState<'MALE' | 'FEMALE' | 'ANY'>('ANY');
  const [rangeMinAge, setRangeMinAge] = useState<number | ''>('');
  const [rangeMaxAge, setRangeMaxAge] = useState<number | ''>('');
  const [rangeMin, setRangeMin] = useState<number | ''>('');
  const [rangeMax, setRangeMax] = useState<number | ''>('');
  const [currentRanges, setCurrentRanges] = useState<any[]>([]);

 const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed filtered tests
  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const categoryStr = typeof t.category === 'object' && t.category !== null 
        ? (t.category as any).name || (t.category as any).id 
        : t.category;
      
      const matchesCat = selectedCat === 'All' || 
                         categoryStr?.toLowerCase() === selectedCat.toLowerCase() ||
                         (typeof t.category === 'object' && t.category !== null && (t.category as any).id?.toLowerCase() === selectedCat.toLowerCase());
      
      return matchesSearch && matchesCat;
    });
  }, [tests, searchTerm, selectedCat]);

  // Reset & Setup drawer for Creation
  const openCreateDrawer = () => {
    setEditingTest(null);
    setFormCode(`TST-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormCat('Blood');
    setFormPrice(0);
    setFormDiscPrice(undefined);
    setFormDesc('');
    setFormFasting(false);
    setFormTime(24);
    setFormSample('Blood (EDTA Tube)');
    setFormParameters([]);
    setHasAttemptedSubmit(false);
    setIsDrawerOpen(true);
  };

  // Setup drawer for Editing
  const openEditDrawer = (test: MedicalTest) => {
    setEditingTest(test);
    setFormCode(test.code);
    setFormName(test.name);
    
    const categoryStr = typeof test.category === 'object' && test.category !== null 
      ? (test.category as any).name || (test.category as any).id 
      : test.category;
      
    const matchedCat = CATEGORIES.find(c => c.toLowerCase() === categoryStr?.toLowerCase()) || 'Blood';
    setFormCat(matchedCat);
    
    setFormPrice(test.price);
    setFormDiscPrice(test.discountedPrice);
    setFormDesc(test.description);
    setFormFasting(test.fastingRequired);
    setFormTime(test.reportTimeHours);
    setFormSample(test.sampleType);
    setFormParameters(test.parameters || []);
    setHasAttemptedSubmit(false);
    setIsDrawerOpen(true);
  };

  // Dynamic Reference Range adder
  const handleAddRange = () => {
    if (rangeMin === '' || rangeMax === '') return;
    const newRange = {
      gender: rangeGender,
      minAge: Number(rangeMinAge) || 0,
      maxAge: Number(rangeMaxAge) || 120,
      minRange: Number(rangeMin),
      maxRange: Number(rangeMax)
    };
    setCurrentRanges([...currentRanges, newRange]);
    
    // Reset range inputs
    setRangeGender('ANY');
    setRangeMinAge('');
    setRangeMaxAge('');
    setRangeMin('');
    setRangeMax('');
  };

  const handleRemoveRange = (idx: number) => {
    setCurrentRanges(currentRanges.filter((_, i) => i !== idx));
  };

  // Dynamic parameter adder
const resetParamForm = () => {
    setParamName('');
    setParamUnit('');
    setParamDesc('');
    setCurrentRanges([]);
    setEditingParamId(null);
    setRangeGender('ANY');
    setRangeMinAge('');
    setRangeMaxAge('');
    setRangeMin('');
    setRangeMax('');
  };

  const handleEditParameter = (param: TestParameter) => {
    setEditingParamId(param.id);
    setParamName(param.name);
    setParamUnit(param.unit);
    setParamDesc((param as any).description || '');
    setCurrentRanges(param.referenceRanges ? [...param.referenceRanges] : []);
  };

  const handleAddParameter = () => {
    if (!paramName || !paramUnit || currentRanges.length === 0) {
      toast.error('Add parameter name, unit, and at least one reference range.');
      return;
    }
    if (editingParamId) {
      setFormParameters(formParameters.map(p =>
        p.id === editingParamId
          ? { ...p, name: paramName, unit: paramUnit, description: paramDesc, referenceRanges: [...currentRanges] }
          : p
      ));
    } else {
      const newParam: TestParameter = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: paramName,
        unit: paramUnit,
        referenceRanges: [...currentRanges],
      };
      setFormParameters([...formParameters, newParam]);
    }
    resetParamForm();
  };

  const handleRemoveParameter = (id: string) => {
    setFormParameters(formParameters.filter(p => p.id !== id));
    if (editingParamId === id) resetParamForm();
  };

  // Save Handler
  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    if (!formName || !formCode) {
      toast.error('Required fields are missing in the specifications panel.');
      return;
    }

    const testPayload: MedicalTest = {
      id: editingTest?.id || `t-${Date.now()}`,
      code: formCode,
      name: formName,
      category: formCat,
      price: Number(formPrice),
      discountedPrice: formDiscPrice ? Number(formDiscPrice) : undefined,
      description: formDesc,
      fastingRequired: formFasting,
      reportTimeHours: Number(formTime),
      sampleType: formSample,
      status: editingTest?.status || 'active',
      parameters: formParameters
    };

    // Transform form fields to match backend schema properties
const backendPayload: any = {
      id: testPayload.id,
      name: testPayload.name,
      description: testPayload.description,
      price: testPayload.price,
      discountedPrice: testPayload.discountedPrice || testPayload.price,
      categoryId: testPayload.category,
      reportTime: `${testPayload.reportTimeHours} Hours`,
      fastingRequired: testPayload.fastingRequired,
      homeCollection: true,
      whyRequired: testPayload.description,
      parameters: formParameters.map((p) => ({
        name: p.name,
        unit: p.unit,
        referenceRanges: p.referenceRanges,
      })),
    };

  setIsSubmitting(true);

    if (editingTest) {
      dispatch(updateTest({ id: editingTest.id, ...backendPayload }))
        .unwrap()
       .then(() => {
          toast.success(`${formName} specification updated successfully.`);
          setIsDrawerOpen(false);
        })
        .catch((err: any) => {
          toast.error(`Update failed: ${err?.message || 'Unknown error'}`);
        })
        .finally(() => setIsSubmitting(false));
    } else {
      dispatch(addTest(backendPayload))
        .unwrap()
      .then(() => {
          toast.success(`New clinical test ${formName} committed to catalog.`);
          setIsDrawerOpen(false);
        })
        .catch((err: any) => {
          toast.error(`Create failed: ${err?.message || 'Unknown error'}`);
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this test from the active catalog?')) {
      dispatch(deleteTest(id));
      toast.success('Catalog entry removed completely.');
    }
  };

  return (
    <div className="w-full flex flex-col h-full select-none relative">
      
    
  {status === 'failed' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold">
          Failed to load tests: {error || 'Unknown error'}. Check that the backend is running and the database is seeded.
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Medical Test Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure lab parameters, base pricing, and clinical range standards.</p>
        </div>

        <button
          onClick={openCreateDrawer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-98 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Test</span>
        </button>
      </div>

     
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl shadow-sm mb-6 flex-shrink-0">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by test name or code (e.g. CBC)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 transition-all"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none whitespace-nowrap pb-1 md:pb-0 max-w-full">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest mr-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* ALL selection */}
          <button
            onClick={() => setSelectedCat('All')}
            className={cn(
              "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none active:scale-95",
              selectedCat === 'All'
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "bg-background border border-border hover:border-primary/40 text-foreground"
            )}
          >
            All ({tests.length})
          </button>

          {/* Mapped filters */}
          {CATEGORIES.map(cat => {
            const count = tests.filter(t => {
              const categoryStr = typeof t.category === 'object' && t.category !== null 
                ? (t.category as any).name || (t.category as any).id 
                : t.category;
              return categoryStr?.toLowerCase() === cat.toLowerCase() ||
                     (typeof t.category === 'object' && t.category !== null && (t.category as any).id?.toLowerCase() === cat.toLowerCase());
            }).length;
            if (count === 0) return null; // Hide empty categories
            
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none active:scale-95",
                  selectedCat === cat
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "bg-background border border-border hover:border-primary/40 text-foreground"
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

    
      {/* Data Table Section */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
        
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse relative text-sm font-medium select-none min-w-[750px]">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-md border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold text-left">Test Specification</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Fasting</th>
                <th className="px-6 py-4 font-bold">Parameters</th>
                <th className="px-6 py-4 font-bold text-right">Base Pricing</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
         <tbody className="divide-y divide-border/40 text-foreground bg-card">
              {testsLoading && tests.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-40" />
                          <div className="h-3 bg-muted rounded w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded-full w-20" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-muted rounded-full w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-14 ml-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-10 mx-auto" /></td>
                  </tr>
                ))
              )}
              <AnimatePresence initial={false}>
                {filteredTests.map((test) => {
                  const hasDiscount = test.discountedPrice && test.discountedPrice < test.price;
                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={test.id} 
                      className="hover:bg-muted/30 transition-colors group border-b border-border/30"
                    >
                      {/* Test Specification Detail */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 flex-shrink-0">
                            <FlaskConical className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm tracking-tight text-foreground mb-0.5">{test.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium tracking-wide">
                              <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">{test.code}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{test.reportTimeHours} Hrs</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase leading-none border border-primary/10 bg-primary/5 text-primary">
                          {typeof test.category === 'object' && test.category !== null
                            ? (test.category as any).name || (test.category as any).id
                            : test.category}
                        </span>
                      </td>

                      {/* Fasting Toggle Column */}
                      <td className="px-6 py-4">
                        {test.fastingRequired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-amber-500/20 bg-amber-500/10 text-amber-700">
                            <AlertCircle className="w-3 h-3" /> Fasting req.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border bg-muted text-muted-foreground">
                            Non-fasting
                          </span>
                        )}
                      </td>

                      {/* Parameters count badge */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-teal-500 fill-teal-500" />
                          {test.parameters?.length || 0} metrics
                        </span>
                      </td>

                      {/* Base Pricing & Discount info */}
                      <td className="px-6 py-4 text-right font-bold">
                        {hasDiscount ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-extrabold text-foreground">₹{test.discountedPrice}</span>
                            <span className="text-[11px] text-muted-foreground line-through decoration-destructive/50 font-medium">₹{test.price}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-extrabold text-foreground">₹{test.price}</span>
                        )}
                      </td>

                      {/* Edit / Delete Operations */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditDrawer(test)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors select-none active:scale-95"
                            title="Edit Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(test.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors select-none active:scale-95"
                            title="Remove Test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              
             {!testsLoading && filteredTests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center bg-card">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
                        <Search className="w-7 h-7 opacity-40" />
                      </div>
                      <h3 className="text-base font-bold text-foreground tracking-tight">No matching tests found</h3>
                      <p className="text-sm text-muted-foreground mt-1.5">We couldn't find any metrics matching "{searchTerm}". Refine your filters or create a new entry.</p>
                      <button onClick={openCreateDrawer} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                        <Plus className="w-4 h-4" /> Add "{searchTerm}" to Catalog
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Counters */}
        <div className="h-12 px-6 border-t border-border flex items-center justify-between text-xs font-semibold text-muted-foreground bg-muted/20 select-none flex-shrink-0">
          <span>Displaying {filteredTests.length} of {tests.length} registered catalog tests</span>
          <span>Healthcare Lab Platform v1.0</span>
        </div>

      </div>

    
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black"
            />
            
         
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col h-full"
            >
              {/* Drawer Top Header */}
              <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground leading-none tracking-tight">
                      {editingTest ? 'Modify Test Specifications' : 'Configure New Diagnostic'}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mt-1 block leading-none">
                      {formCode || 'CODE SETUP'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Area */}
              <form id="catalogForm" onSubmit={handleSaveTest} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Block 1: Basic Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Basic Specifications</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Unique Code <span className="text-destructive">*</span></label>
                      <input 
                        type="text" 
                        value={formCode} 
                        onChange={e => setFormCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CBC01"
                        required
                        className={cn(
                          "w-full h-10 border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-semibold transition-all",
                          hasAttemptedSubmit && !formCode ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border"
                        )}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Department Category</label>
                      <select
                        value={formCat}
                        onChange={e => setFormCat(e.target.value as TestCategory)}
                        className="w-full h-10 border border-border rounded-xl px-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-medium transition-all"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground pl-0.5">Medical Test Name <span className="text-destructive">*</span></label>
                    <input 
                      type="text" 
                      value={formName} 
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Complete Blood Count (CBC)"
                      required
                      className={cn(
                        "w-full h-10 border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-medium transition-all",
                        hasAttemptedSubmit && !formName ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground pl-0.5">Clinical Description</label>
                    <textarea 
                      value={formDesc} 
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder="Summarize target screening clinical metrics..."
                      className="w-full h-20 border border-border rounded-xl p-3 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-medium resize-none transition-all"
                    />
                  </div>
                </div>

                {/* Block 2: Workflow Settings */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Clinical Constraints & Lab Setup</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Vial / Sample Type</label>
                      <input 
                        type="text" 
                        value={formSample} 
                        onChange={e => setFormSample(e.target.value)}
                        placeholder="e.g., Blood (EDTA Tube)"
                        className="w-full h-10 border border-border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-medium transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Report Turnaround (Hours)</label>
                      <input 
                        type="number" 
                        value={formTime} 
                        onChange={e => setFormTime(Number(e.target.value))}
                        min={1}
                        className="w-full h-10 border border-border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-border/80 rounded-xl bg-muted/10 select-none">
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-bold text-foreground">Fasting Requirement</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Does patient need to abstain from food for 8-12 hrs?</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFasting(!formFasting)}
                      className={cn(
                        "w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40",
                        formFasting ? "bg-primary justify-end" : "bg-muted border border-border justify-start"
                      )}
                    >
                      <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>
                </div>

                {/* Block 3: Commercials */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1">Commercial Model Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Standard Retail Price (₹)</label>
                      <input 
                        type="number" 
                        value={formPrice || ''} 
                        onChange={e => setFormPrice(Number(e.target.value))}
                        placeholder="Base cost"
                        required
                        className="w-full h-10 border border-border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground pl-0.5">Offer Price (₹) (Optional)</label>
                      <input 
                        type="number" 
                        value={formDiscPrice || ''} 
                        onChange={e => setFormDiscPrice(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Offer discount cost"
                        className="w-full h-10 border border-border rounded-xl px-3.5 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/60 font-bold transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Block 4: Parameter Metrics Manager */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Biological Reference Intervals</h4>
                    <span className="text-[10px] text-primary font-bold font-mono">({formParameters.length} ADDED)</span>
                  </div>

               <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {formParameters.map((param) => (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={param.id}
                          className={cn(
                            "p-2.5 border rounded-lg text-xs font-medium select-none",
                            editingParamId === param.id
                              ? "border-primary bg-primary/5"
                              : "bg-muted/30 border-border/50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <span className="font-bold text-foreground">{param.name}</span>
                              <span className="text-muted-foreground ml-1.5">({param.unit})</span>
                              {(param as any).description && (
                                <span className="text-muted-foreground ml-1.5 italic">- {(param as any).description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditParameter(param)}
                                className="text-muted-foreground hover:text-primary p-0.5 hover:bg-primary/10 rounded"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParameter(param.id)}
                                className="text-muted-foreground hover:text-destructive p-0.5 hover:bg-destructive/10 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {param.referenceRanges && param.referenceRanges.map((r, i) => (
                              <span key={i} className="font-bold text-foreground bg-background px-2 py-0.5 border border-border/80 rounded text-[10px]">
                                {r.gender} | {r.minAge ?? 0}-{r.maxAge ?? 120} Yrs | {r.minRange} – {r.maxRange}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                <div className="p-4 border border-border/60 rounded-xl bg-muted/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      <span className="flex items-center gap-1">
  <PencilLine className="w-3 h-3" />
  {editingParamId ? 'Editing Parameter' : 'New Parameter'}
</span>
                      </span>
                      {editingParamId && (
                        <button type="button" onClick={resetParamForm} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                          Cancel Edit
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Metric Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Hemoglobin"
                          value={paramName}
                          onChange={e => setParamName(e.target.value)}
                          className="w-full h-8 border border-border/80 rounded-lg px-2.5 text-xs bg-background outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Unit (S.I.)</label>
                        <input
                          type="text"
                          placeholder="e.g. g/dL"
                          value={paramUnit}
                          onChange={e => setParamUnit(e.target.value)}
                          className="w-full h-8 border border-border/80 rounded-lg px-2.5 text-xs bg-background outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Description (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Measures oxygen-carrying protein in blood"
                        value={paramDesc}
                        onChange={e => setParamDesc(e.target.value)}
                        className="w-full h-8 border border-border/80 rounded-lg px-2.5 text-xs bg-background outline-none"
                      />
                    </div>

                    {/* Added Reference Ranges for current parameter */}
                    {currentRanges.length > 0 && (
                      <div className="bg-background rounded border p-2 space-y-1">
                        {currentRanges.map((r, idx) => (
                          <div key={idx} className="text-[10px] flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {r.gender} • {r.minAge}-{r.maxAge} Yrs • {r.minRange} to {r.maxRange}
                            </span>
                            <button type="button" onClick={() => handleRemoveRange(idx)} className="text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-2 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Gender</label>
                        <select
                          value={rangeGender}
                          onChange={e => setRangeGender(e.target.value as any)}
                          className="w-full h-7 border border-border/80 rounded px-1.5 text-[10px] bg-background outline-none font-bold"
                        >
                          <option value="ANY">ANY</option>
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Min Age</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={rangeMinAge}
                          onChange={e => setRangeMinAge(e.target.value ? Number(e.target.value) : '')}
                          className="w-full h-7 border border-border/80 rounded px-1.5 text-[10px] bg-background outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Max Age</label>
                        <input
                          type="number"
                          placeholder="120"
                          value={rangeMaxAge}
                          onChange={e => setRangeMaxAge(e.target.value ? Number(e.target.value) : '')}
                          className="w-full h-7 border border-border/80 rounded px-1.5 text-[10px] bg-background outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Min Ref</label>
                        <input
                          type="number"
                          step="any"
                          value={rangeMin}
                          onChange={e => setRangeMin(e.target.value ? Number(e.target.value) : '')}
                          className="w-full h-7 border border-border/80 rounded px-1.5 text-[10px] bg-background outline-none font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Max Ref</label>
                        <input
                          type="number"
                          step="any"
                          value={rangeMax}
                          onChange={e => setRangeMax(e.target.value ? Number(e.target.value) : '')}
                          className="w-full h-7 border border-border/80 rounded px-1.5 text-[10px] bg-background outline-none font-bold"
                        />
                      </div>
                    </div>
                    
                 <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleAddRange}
                        disabled={rangeMin === '' || rangeMax === ''}
                        className="h-7 px-3 border border-border bg-background text-foreground disabled:opacity-40 rounded text-[10px] font-bold transition-all active:scale-[0.98]"
                      >
                        + Range
                      </button>
                      <button
                        type="button"
                        onClick={handleAddParameter}
                        disabled={!paramName || !paramUnit || currentRanges.length === 0}
                        className="h-7 px-3 flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 rounded text-[10px] font-bold transition-all active:scale-[0.98]"
                      >
                        <Check className="w-3 h-3 mr-1" /> {editingParamId ? 'Update Metric' : 'Add Full Metric'}
                      </button>
                    </div>
                  </div>
                </div>

              </form>

              {/* Drawer Bottom Sticky Controls */}
              <div className="h-16 px-6 border-t border-border bg-card flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 h-10 border border-border rounded-xl text-sm font-bold hover:bg-muted hover:text-foreground transition-colors active:scale-98"
                >
                  Discard Changes
                </button>
              <button
                  type="submit"
                  form="catalogForm"
                  disabled={isSubmitting}
                  className="px-5 h-10 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 flex items-center gap-2 transition-all active:scale-98 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>{editingTest ? 'Updating...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save to Catalog</span>
                    </>
                  )}
                </button>
              </div>
              
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
