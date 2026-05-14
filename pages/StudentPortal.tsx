
import React, { useState, useEffect } from 'react';
import { Search, Award, BookOpen, AlertCircle, Lock, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, GraduationCap, Calendar, ArrowRight } from 'lucide-react';
import { StorageService } from '../services/storage';
import { StudentResult, Course, Batch } from '../types';
import { Link } from 'react-router-dom';

// Custom Eye of Horus Icon
const EyeOfHorus = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 7.5C6 4.5 14 3.5 21 6.5" strokeWidth="2" />
    <path d="M2.5 11.5C7 6.5 17 6.5 21.5 11.5" strokeWidth="2" />
    <path d="M2.5 11.5C7 16.5 17 16.5 21.5 11.5" strokeWidth="2" />
    <circle cx="12" cy="11.5" r="3" fill="currentColor" className="opacity-20" />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" />
    <path d="M12 15.5V20.5" strokeWidth="2" />
    <path d="M18 14.5C18 18.5 15 20.5 11 19.5" strokeWidth="2" />
  </svg>
);

const StudentPortal: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState<{result: StudentResult, course: Course}[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeBatch, setActiveBatch] = useState<Batch | undefined>();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  
  // Track expanded cards for details
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  useEffect(() => {
     StorageService.getActiveBatch().then(b => {
         setActiveBatch(b);
     }).catch(err => {
         console.error("Failed to load active batch:", err);
     }).finally(() => {
         setInitLoading(false);
     });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !activeBatch) return;
    
    setLoading(true);
    setHasSearched(false);
    setExpandedCourseId(null);
    try {
        const data = await StorageService.getAllStudentResults(studentId.trim(), activeBatch.id);
        setResults(data);
        setHasSearched(true);
    } catch (e) {
        alert("Error fetching results. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const toggleDetails = (id: string) => {
      setExpandedCourseId(expandedCourseId === id ? null : id);
  };

  if(initLoading) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden px-4">
              <div className="relative z-10 flex flex-col items-center animate-scale-up text-center">
                  <div className="flex items-center gap-3 md:gap-4 mb-6">
                      <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 leading-none" style={{ fontFamily: 'Arial, sans-serif' }}>HUE</h1>
                      <EyeOfHorus size={48} className="text-indigo-600 md:w-16 md:h-16" />
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 bg-white border border-slate-100 px-5 py-2.5 rounded-full shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-wide">Establishing Connection...</span>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-4 md:p-12 relative font-sans text-slate-900">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[300px] md:h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>

      {/* Staff Login Link - Adjusted for mobile safe area */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
        <Link to="/login" className="flex items-center gap-1.5 md:gap-2 text-slate-500 font-bold hover:text-indigo-600 bg-white/60 backdrop-blur-md px-3 py-2 md:px-5 md:py-2.5 rounded-full border border-slate-200 hover:border-indigo-200 transition-all text-xs md:text-sm group shadow-sm">
          <Lock size={12} className="group-hover:text-indigo-500 md:w-3.5 md:h-3.5" />
          <span>Staff Access</span>
        </Link>
      </div>

      <div className="w-full max-w-2xl space-y-8 md:space-y-12 relative z-10">
        
        {/* Header Branding */}
        <div className="text-center space-y-4 md:space-y-6 pt-12 md:pt-10">
          <div className="flex justify-center mb-4 md:mb-6">
             <div className="flex items-center gap-3 md:gap-5 p-5 md:p-8 bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 animate-fade-in-up">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 leading-none" style={{ fontFamily: 'Arial, sans-serif' }}>HUE</h1>
                <div className="w-px h-10 md:h-16 bg-slate-100 mx-1 md:mx-2"></div>
                <EyeOfHorus size={40} className="text-indigo-600 md:w-16 md:h-16" />
             </div>
          </div>
          <div className="space-y-1.5 md:space-y-2 animate-fade-in-up delay-100 px-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Student Result Portal</h1>
            <p className="text-slate-500 font-medium text-xs md:text-base flex items-center justify-center gap-1.5 md:gap-2">
                <Calendar size={14} className="text-indigo-500 md:w-4 md:h-4"/>
                {activeBatch ? activeBatch.name : "Academic Year Not Active"}
            </p>
          </div>
        </div>

        {/* Search Box */}
        {activeBatch ? (
          <div className="animate-fade-in-up delay-200 px-1 md:px-0">
            <form onSubmit={handleSearch} className="relative group max-w-xl mx-auto">
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[32px] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
               <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2 flex items-center relative border border-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all duration-300">
                  <div className="pl-6 pr-2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors"><Search size={24} strokeWidth={2.5} /></div>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter Student ID..."
                    className="w-full bg-transparent px-2 py-4 md:py-5 text-lg md:text-xl font-black text-slate-800 placeholder-slate-300 outline-none tracking-wide"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-4 md:p-5 rounded-[24px] font-black hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-70 disabled:active:scale-100 shrink-0 hover:-translate-y-0.5"
                  >
                    {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <ArrowRight className="w-6 h-6" strokeWidth={2.5} />}
                  </button>
               </div>
            </form>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-[24px] text-center max-w-md mx-auto animate-fade-in-up">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-amber-800 font-bold">System Maintenance</p>
            <p className="text-sm text-amber-600 mt-1">Result portal is currently offline for updates.</p>
          </div>
        )}

        {/* Results Display */}
        {hasSearched && results && (
          <div className="space-y-4 md:space-y-6 animate-fade-in-up delay-100 pb-20">
             {results.length === 0 ? (
               <div className="text-center py-10 md:py-12 bg-white rounded-[32px] border border-slate-200 shadow-sm mx-1 md:mx-0">
                 <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Search size={28} className="md:w-8 md:h-8" />
                 </div>
                 <p className="text-slate-900 font-bold text-lg">No Results Found</p>
                 <p className="text-slate-400 text-sm mt-1 px-4">We couldn't find records for ID <span className="font-mono bg-slate-100 px-1 rounded text-slate-600 break-all">{studentId}</span></p>
               </div>
             ) : (
               <div className="grid gap-4 md:gap-6">
                 {results.map(({ result, course }) => {
                   const isPassed = result.calculatedTotal >= (course.config.totalTargetScore * 0.5);
                   const isExpanded = expandedCourseId === course.id;

                   if (result.isLocked) {
                       return (
                           <div key={course.id} className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                               <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                   <Lock size={28} className="md:w-8 md:h-8" />
                               </div>
                               <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1">{course.name}</h3>
                               <p className="text-slate-400 font-mono text-xs md:text-sm mb-4">{course.code}</p>
                               <div className="bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                                   Result Withheld
                               </div>
                           </div>
                       );
                   }

                   return (
                     <div key={course.id} className="bg-white/80 backdrop-blur-xl rounded-[32px] md:rounded-[40px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative group transition-all duration-300 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:border-indigo-200 hover:-translate-y-1">
                        {/* Status Strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-2 md:w-2.5 transition-colors ${isPassed ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-gradient-to-b from-rose-400 to-rose-600'}`}></div>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-500 opacity-60"></div>

                        <div className="p-6 md:p-10 pl-8 md:pl-12 relative z-10">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 md:gap-0">
                                <div className="flex-1">
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">{course.name}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <span className="font-mono text-[10px] md:text-xs font-black text-slate-500 bg-slate-100/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200/50 shadow-sm">{course.code}</span>
                                        <span className="text-[11px] md:text-sm font-black text-slate-400">{result.studentName}</span>
                                    </div>
                                </div>
                                <div className={`self-start md:self-auto px-4 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${isPassed ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200/50' : 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 border border-rose-200/50'}`}>
                                    {isPassed ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <XCircle size={16} strokeWidth={2.5} />}
                                    {isPassed ? 'Passed' : 'At Risk'}
                                </div>
                            </div>

                            {/* Score Big Display */}
                            <div className="flex items-end gap-3 mb-8">
                                <div className={`text-6xl md:text-7xl font-black tracking-tighter leading-none drop-shadow-sm ${isPassed ? 'text-slate-900' : 'text-rose-600'}`}>
                                    {result.calculatedTotal}
                                </div>
                                <div className="text-xl md:text-2xl font-black text-slate-300 mb-1.5 md:mb-2">
                                    / {course.config.totalTargetScore}
                                </div>
                            </div>

                            {/* Expand Toggle */}
                            <button 
                                onClick={() => toggleDetails(course.id)}
                                className="w-full py-4 bg-slate-50/50 hover:bg-indigo-50 rounded-[20px] flex items-center justify-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-100 active:scale-95"
                            >
                                {isExpanded ? 'Hide Details' : 'View Breakdown'}
                                {isExpanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                            </button>
                        </div>

                        {/* Expanded Breakdown */}
                        {isExpanded && (
                            <div className="bg-slate-50/80 border-t border-slate-100 p-5 md:p-8 pl-7 md:pl-10 animate-fade-in space-y-5 md:space-y-6">
                                {/* Quizzes */}
                                {course.config.quizCount > 0 && (
                                    <div>
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Quizzes
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.quizScores.map((s, i) => (
                                                <div key={i} className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl border text-xs md:text-sm font-bold ${
                                                        s === null ? 'bg-slate-100 text-slate-400 border-slate-200' : 
                                                        'bg-white text-slate-800 border-slate-200 shadow-sm'
                                                    }`}>
                                                        {s ?? '-'}
                                                    </div>
                                                    <span className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-1">Q{i+1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Assignments */}
                                {course.config.assignmentCount > 0 && (
                                    <div>
                                        <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Assignments
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.assignmentScores.map((s, i) => (
                                                <div key={i} className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl border text-xs md:text-sm font-bold ${
                                                        s === null ? 'bg-slate-100 text-slate-400 border-slate-200' : 
                                                        'bg-white text-slate-800 border-slate-200 shadow-sm'
                                                    }`}>
                                                        {s ?? '-'}
                                                    </div>
                                                    <span className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-1">A{i+1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bonus */}
                                {(result.bonusScore ?? 0) > 0 && (
                                    <div className="flex items-center gap-2 md:gap-3 bg-amber-50 p-2 md:p-3 rounded-xl border border-amber-100 w-fit">
                                        <Award size={14} className="text-amber-500 md:w-4 md:h-4" />
                                        <span className="text-[10px] md:text-xs font-bold text-amber-700">+{result.bonusScore} Bonus Points Awarded</span>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center pb-6 md:pb-8 opacity-60 px-4">
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
               Faculty of Business Administration<br/>
               <span className="text-indigo-400">Measurement & Evaluation Unit</span>
            </p>
        </div>

      </div>
    </div>
  );
};

export default StudentPortal;
