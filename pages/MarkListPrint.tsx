
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Course, StudentResult, Batch } from '../types';
import { ChevronLeft, Printer, Calendar, Loader2, AlertCircle, Filter, LayoutList } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const MarkListPrint: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses: contextCourses, activeBatch } = useData();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  // Rows Per Page State - Safe default for A4 to avoid spillover
  const [rowsPerPage, setRowsPerPage] = useState<number>(30);

  useEffect(() => {
    const loadData = async () => {
        if (!courseId) return;
        setLoading(true);
        setError(null);

        try {
            let foundCourse: Course | undefined;
            let foundBatch: Batch | undefined;

            const fromContext = contextCourses.find(c => String(c.id) === String(courseId));
            
            if (fromContext && activeBatch) {
                if (String(fromContext.batchId) === String(activeBatch.id)) {
                    foundCourse = fromContext;
                    foundBatch = activeBatch;
                }
            } 
            
            if (!foundCourse) {
                 try {
                     const batches = await StorageService.getBatches();
                     const sortedBatches = batches.sort((a, b) => (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1);

                     for (const b of sortedBatches) {
                        try {
                            const courses = await StorageService.getCourses(b.id);
                            const c = courses.find(cr => String(cr.id) === String(courseId));
                            if (c) {
                                foundCourse = c;
                                foundBatch = b;
                                break;
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch courses for batch ${b.name}`, e);
                        }
                    }
                 } catch (e) {
                     console.error("Failed to fetch batches", e);
                 }
            }

            if (foundCourse && foundBatch) {
                setCourse(foundCourse);
                setBatch(foundBatch);
                const results = await StorageService.getResults(String(foundCourse.id), String(foundBatch.id));
                setStudents(results);
            } else {
                setError("Course data not found. It might have been deleted.");
            }

        } catch (error) {
            console.error("Failed to load mark list data", error);
            setError("Connection failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [courseId, contextCourses, activeBatch]);

  // Logic to filter students by program
  const filteredStudents = useMemo(() => {
      if (selectedProgram === 'ALL') return students;
      return students.filter(s => (s.program || 'General') === selectedProgram);
  }, [students, selectedProgram]);

  // Dynamic Program List
  const uniquePrograms = useMemo(() => {
      const progs = new Set<string>();
      students.forEach(s => {
          if (s.program && s.program.trim() !== '') {
              progs.add(s.program);
          } else {
              progs.add('General');
          }
      });
      return Array.from(progs).sort();
  }, [students]);

  const weights = useMemo(() => {
    if (!course) return { quiz: 0, assign: 0, total: 0 };
    const quizTotal = course.config.quizBestOf * course.config.quizMaxScore;
    const assignTotal = course.config.assignmentBestOf * course.config.assignmentMaxScore;
    return { quiz: quizTotal, assign: assignTotal, total: course.config.totalTargetScore };
  }, [course]);

  const getComponentScore = (scores: (number | null)[], maxScores: number[], bestOf: number, itemWeight: number) => {
    if (!scores || !course) return 0;
    
    // Check if all are empty
    const isAllAbs = scores.every(s => s === null || s === undefined || (s as any) === '');
    if (isAllAbs) return 'Abs';

    const normalized = scores.map((score, i) => {
      const effectiveScore = (score === null || score === undefined || (score as any) === '') ? 0 : Number(score);
      const individualMax = (maxScores && maxScores[i] > 0) ? maxScores[i] : itemWeight;
      if (individualMax === 0) return 0;
      return (effectiveScore / individualMax) * itemWeight;
    });

    const sorted = [...normalized].sort((a, b) => b - a);
    const sum = sorted.slice(0, bestOf).reduce((a, b) => a + b, 0);
    return parseFloat(sum.toFixed(1)); 
  };

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="font-bold text-slate-500">Generating Official Document...</p>
        </div>
      );
  }

  if (error || !course) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-slate-50">
            <div className="p-4 bg-rose-100 text-rose-500 rounded-full">
                <AlertCircle size={48} />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-black text-slate-800 mb-2">Document Unavailable</h2>
                <p className="text-slate-500 font-medium">{error || "Course details could not be retrieved."}</p>
            </div>
            <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
                Go Back
            </button>
        </div>
      );
  }

  // Chunk students for pages
  const chunks = [];
  for (let i = 0; i < filteredStudents.length; i += rowsPerPage) {
      chunks.push(filteredStudents.slice(i, i + rowsPerPage));
  }
  if(chunks.length === 0) chunks.push([]); // Handle empty state

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white font-sans text-slate-900 print:w-full print:h-auto">
      
      {/* Navigation & Filters Bar */}
      <div className="max-w-[210mm] mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200">
                <LayoutList size={18} className="text-slate-400" />
                <span className="text-xs font-black uppercase text-slate-400">Rows/Page:</span>
                <input 
                    type="number" 
                    min="5" 
                    max="60" 
                    value={rowsPerPage} 
                    onChange={e => setRowsPerPage(parseInt(e.target.value) || 30)}
                    className="w-16 font-bold text-slate-800 outline-none bg-slate-50 border border-slate-200 rounded p-1 text-center"
                />
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200">
                <Filter size={18} className="text-indigo-500" />
                <span className="text-xs font-black uppercase text-slate-400">Filter Program:</span>
                <select 
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer min-w-[120px]"
                >
                    <option value="ALL">All Programs</option>
                    {uniquePrograms.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-1">
            <Printer size={20} /> Print Official List
            </button>
        </div>
      </div>

      {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className="bg-white max-w-[210mm] mx-auto min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:w-full print:max-w-none print:p-[5mm] flex flex-col mb-8 print:mb-0 print-break-after">
            
            {/* Document Header - Compact */}
            <div className="flex justify-between items-end border-b border-black pb-3 mb-3">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black rounded-sm text-[10px]">H</div>
                        <h1 className="text-lg font-black tracking-tight uppercase">HUE</h1>
                    </div>
                    <p className="font-bold text-[10px] uppercase tracking-[0.15em] text-slate-600 leading-tight">Horus University Egypt</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Faculty of Business Administration</p> 
                </div>
                
                <div className="text-right">
                    <h2 className="text-lg font-black uppercase mb-0.5 leading-none">Course Mark Sheet</h2>
                    <div className="flex items-center justify-end gap-1 text-xs font-bold text-slate-600">
                        <Calendar size={12} />
                        <span>{batch?.name || '2024 - 2025'}</span>
                    </div>
                </div>
            </div>

            {/* Course Details Block - Compact Single Row */}
            <div className="grid grid-cols-12 gap-4 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200 print:bg-white print:border print:border-black print:rounded-none print:p-2 items-center">
                <div className="col-span-5 flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 print:text-black leading-none mb-0.5">Course Title</span>
                    <span className="font-bold text-sm truncate">{course.name}</span>
                </div>
                <div className="col-span-3 flex flex-col border-l border-slate-200 pl-4 print:border-black">
                    <span className="text-[9px] font-black uppercase text-slate-400 print:text-black leading-none mb-0.5">Academic Program</span>
                    <span className="font-bold text-sm text-indigo-600 print:text-black">{selectedProgram === 'ALL' ? 'All Programs' : selectedProgram}</span>
                </div>
                <div className="col-span-2 flex flex-col border-l border-slate-200 pl-4 print:border-black">
                    <span className="text-[9px] font-black uppercase text-slate-400 print:text-black leading-none mb-0.5">Code</span>
                    <span className="font-mono font-bold text-sm">{course.code}</span>
                </div>
                <div className="col-span-2 flex flex-col border-l border-slate-200 pl-4 print:border-black">
                    <span className="text-[9px] font-black uppercase text-slate-400 print:text-black leading-none mb-0.5">Page</span>
                    <span className="font-bold text-sm">{pageIndex + 1} / {chunks.length}</span>
                </div>
            </div>

            {/* Marks Table - Compact */}
            <div className="flex-1">
                <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-slate-100 print:bg-transparent">
                    <th className="border border-black py-1.5 px-2 w-10 text-center font-black uppercase">#</th>
                    <th className="border border-black py-1.5 px-3 text-left font-black uppercase">Student Name</th>
                    <th className="border border-black py-1.5 px-3 w-28 text-center font-black uppercase">ID Code</th>
                    <th className="border border-black py-1.5 px-2 w-20 text-center font-black uppercase">
                        Assign. <span className="text-[9px] opacity-70">({weights.assign})</span>
                    </th>
                    <th className="border border-black py-1.5 px-2 w-20 text-center font-black uppercase">
                        Quiz <span className="text-[9px] opacity-70">({weights.quiz})</span>
                    </th>
                    </tr>
                </thead>
                <tbody>
                    {chunk.map((student, index) => {
                    const quizScore = getComponentScore(student.quizScores, course.config.quizIndividualMaxScores, course.config.quizBestOf, course.config.quizMaxScore);
                    const assignScore = getComponentScore(student.assignmentScores, course.config.assignmentIndividualMaxScores, course.config.assignmentBestOf, course.config.assignmentMaxScore);
                    
                    return (
                        <tr key={student.id} className="break-inside-avoid">
                        <td className="border border-black py-1 text-center font-bold text-slate-500 print:text-black">{(pageIndex * rowsPerPage) + index + 1}</td>
                        <td className="border border-black px-2 py-1 text-left font-bold text-slate-800 print:text-black truncate max-w-[250px]">{student.studentName}</td>
                        <td className="border border-black py-1 text-center font-mono font-bold text-slate-600 print:text-black">{student.studentId}</td>
                        <td className="border border-black py-1 text-center font-medium">{assignScore}</td>
                        <td className="border border-black py-1 text-center font-medium">{quizScore}</td>
                        </tr>
                    );
                    })}
                    
                    {chunk.length === 0 && (
                        <tr>
                            <td colSpan={5} className="border border-black p-8 text-center text-slate-400 font-bold italic">No students registered in this program.</td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>

            {/* Footer / Signatures - Compact */}
            <div className="mt-auto pt-6 break-inside-avoid">
                <div className="flex justify-end">
                    <div className="inline-block text-center">
                        <p className="font-bold text-[10px] uppercase tracking-wider mb-6" dir="rtl">توقيع أستاذ المقرر</p>
                        <div className="w-48 border-b border-black"></div>
                    </div>
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default MarkListPrint;
