
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { calculateStudentGrade } from '../services/storage';
import { StudentResult, User, UserRole } from '../types';
import { 
  Lock, FileSpreadsheet, Trash2, Plus, 
  Printer, Search, CheckCircle2, 
  Clock, ArrowRight, BarChart2, ChevronDown, Unlock, Filter, 
  FileUp, List, Zap, Check, UserPlus, FileDown,
  Layout, Target, X, Circle, Upload, Download, ShieldCheck, Loader2, Play, RefreshCw, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

type TabMode = 'GRID' | 'TURBO' | 'ROSTER' | 'SINGLE';
type SidebarFilter = 'ALL' | 'PENDING' | 'COMPLETED';

interface GradeEntryProps {
  user: User;
}

// Utility for Fuzzy Arabic Search (Used for Search Bar)
const normalizeArabic = (text: string) => {
  if (!text) return '';
  return text
    .replace(/(آ|إ|أ)/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, ''); // Remove Tashkeel
};

// Strict ID Normalization to prevent duplicates
const cleanId = (id: any) => {
    if (id === null || id === undefined) return '';
    return String(id).trim().toUpperCase();
};

const GradeEntry: React.FC<GradeEntryProps> = ({ user }) => {
  const navigate = useNavigate();
  const { activeBatch, courses: allCourses, getCourseResults, saveResultBackground, bulkSaveResults, deleteResult } = useData();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabMode>('GRID'); 
  const [isLoading, setIsLoading] = useState(false);
  const [gridSearchQuery, setGridSearchQuery] = useState('');

  // --- Turbo Mode State ---
  const [turboContext, setTurboContext] = useState<{ type: 'quiz' | 'assignment', index: number }>({ type: 'quiz', index: 0 });
  const [turboSearch, setTurboSearch] = useState('');
  const [turboSelectedStudentId, setTurboSelectedStudentId] = useState<string | null>(null);
  const [turboGradeInput, setTurboGradeInput] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('ALL');
  
  const turboSearchInputRef = useRef<HTMLInputElement>(null);
  const turboGradeInputRef = useRef<HTMLInputElement>(null);
  const courseMenuRef = useRef<HTMLDivElement>(null);

  // --- Upload States (Shared for Single & Roster) ---
  const [uploadPreviewData, setUploadPreviewData] = useState<any[] | null>(null);
  const [uploadType, setUploadType] = useState<'SINGLE' | 'ROSTER' | null>(null); // To distinguish preview mode
  const [uploadStatus, setUploadStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  
  // --- Single Upload Specific ---
  const [singleTarget, setSingleTarget] = useState<string>('quiz-0');

  // --- Roster State ---
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentProgram, setNewStudentProgram] = useState('General');

  const isReadOnly = user.role === UserRole.PROFESSOR;

  const allowedCourses = useMemo(() => {
    if (user.role === UserRole.ASSISTANT) {
      return allCourses.filter(c => c.assistantIds?.includes(user.id));
    } else if (user.role === UserRole.PROFESSOR) {
      return allCourses.filter(c => c.professorIds?.includes(user.id));
    } else {
      return allCourses;
    }
  }, [allCourses, user]);

  const selectedCourse = useMemo(() => allowedCourses.find(c => String(c.id) === String(selectedCourseId)), [allowedCourses, selectedCourseId]);

  // CRITICAL: Safe Configuration
  const safeConfig = useMemo(() => {
      if (!selectedCourse) return null;
      
      const baseConfig = selectedCourse.config || {
          quizCount: 0,
          quizMaxScore: 0,
          quizIndividualMaxScores: [],
          quizBestOf: 0,
          assignmentCount: 0,
          assignmentMaxScore: 0,
          assignmentIndividualMaxScores: [],
          assignmentBestOf: 0,
          totalTargetScore: 0,
          enableBonus: false
      };

      return {
          ...baseConfig,
          quizIndividualMaxScores: Array.isArray(baseConfig.quizIndividualMaxScores) ? baseConfig.quizIndividualMaxScores : [],
          assignmentIndividualMaxScores: Array.isArray(baseConfig.assignmentIndividualMaxScores) ? baseConfig.assignmentIndividualMaxScores : []
      };
  }, [selectedCourse]);

  // CRITICAL: Safe Fetch with Data Sanitization
  const fetchLatestData = useCallback(async (courseId: string) => {
      setIsLoading(true);
      try {
          const res = await getCourseResults(courseId, true);
          
          const currentCourse = allCourses.find(c => String(c.id) === String(courseId));
          const qCount = currentCourse?.config?.quizCount || 0;
          const aCount = currentCourse?.config?.assignmentCount || 0;

          const safeStudents = res.map(s => ({
              ...s,
              quizScores: Array.isArray(s.quizScores) ? s.quizScores : Array(qCount).fill(null),
              assignmentScores: Array.isArray(s.assignmentScores) ? s.assignmentScores : Array(aCount).fill(null),
              calculatedTotal: typeof s.calculatedTotal === 'number' ? s.calculatedTotal : 0
          }));

          const sortedStudents = safeStudents.sort((a, b) => {
              const oa = a.orderIndex ?? 99999;
              const ob = b.orderIndex ?? 99999;
              return oa - ob;
          });
          setStudents(sortedStudents);
          
          if (safeStudents.length === 0 && activeTab !== 'ROSTER') setActiveTab('ROSTER');
          else if (safeStudents.length > 0 && activeTab === 'ROSTER') setActiveTab('GRID');
      } catch (error) {
          console.error("Sync failed", error);
      } finally {
          setIsLoading(false);
      }
  }, [getCourseResults, activeTab, allCourses]);

  useEffect(() => {
    if (selectedCourseId) {
        fetchLatestData(selectedCourseId);
    } else {
        setStudents([]);
    }
  }, [selectedCourseId]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!courseMenuRef.current) return;
      if (!courseMenuRef.current.contains(event.target as Node)) {
        setIsCourseMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCourseMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const isAllAbs = (scores: (number | null)[]) => {
      if (!Array.isArray(scores)) return true;
      return scores.every(s => s === null || s === undefined || (s as any) === '');
  };

  const filteredGridStudents = useMemo(() => {
      const lowerQ = gridSearchQuery.toLowerCase().trim();
      if (!lowerQ) return students;
      return students.filter(s => {
          const name = s.studentName ? s.studentName.toLowerCase() : '';
          const id = s.studentId ? String(s.studentId).toLowerCase() : '';
          return name.includes(lowerQ) || id.includes(lowerQ);
      });
  }, [students, gridSearchQuery]);


  // Helper to handle local update + sync
  const handleLocalChange = (student: StudentResult, type: 'quiz' | 'assign' | 'bonus', index: number | null, value: string) => {
      if(!selectedCourse) return;

      const numVal = value === '' ? null : Math.max(0, parseFloat(value) || 0);
      const updatedStudent = { ...student };
      
      if (type === 'quiz' && index !== null) {
          const newScores = [...(updatedStudent.quizScores || [])];
          newScores[index] = numVal;
          updatedStudent.quizScores = newScores;
      } else if (type === 'assign' && index !== null) {
          const newScores = [...(updatedStudent.assignmentScores || [])];
          newScores[index] = numVal;
          updatedStudent.assignmentScores = newScores;
      } else if (type === 'bonus') {
          updatedStudent.bonusScore = numVal;
      }

      // Recalculate Total
      updatedStudent.calculatedTotal = calculateStudentGrade(
          updatedStudent.quizScores, 
          updatedStudent.assignmentScores, 
          updatedStudent.bonusScore, 
          selectedCourse.config
      );

      // 1. Immediate Local State Update (Fixes Input Lag)
      setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));

      // 2. Debounced Background Sync
      saveResultBackground(updatedStudent);
  };

  // --- Roster Functions ---

  const handleDownloadTemplate = () => {
      const wb = XLSX.utils.book_new();
      const templateData = [
          { 'Student ID': '2024001', 'Student Name': 'Example Student', 'Program': 'General' },
          { 'Student ID': '2024002', 'Student Name': 'Example 2', 'Program': 'Accounting' }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, "Roster Template");
      XLSX.writeFile(wb, "Student_Roster_Template.xlsx");
  };

  // --- EXPORT GRID FUNCTIONALITY ---
  const handleExportGrid = () => {
    if (!selectedCourse) return;

    const exportData = filteredGridStudents.map(s => {
        const row: any = {
            'Student ID': s.studentId,
            'Student Name': s.studentName,
            'Program': s.program || 'General'
        };

        // Quizzes
        for (let i = 0; i < selectedCourse.config.quizCount; i++) {
             row[`Q${i+1}`] = (s.quizScores?.[i] === null || s.quizScores?.[i] === undefined) ? '' : s.quizScores[i];
        }
        
        // Assignments
        for (let i = 0; i < selectedCourse.config.assignmentCount; i++) {
             row[`A${i+1}`] = (s.assignmentScores?.[i] === null || s.assignmentScores?.[i] === undefined) ? '' : s.assignmentScores[i];
        }

        if (selectedCourse.config.enableBonus) {
            row['Bonus'] = s.bonusScore ?? '';
        }

        row['Calculated Total'] = s.calculatedTotal;
        return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto width (approximation)
    const wscols = Object.keys(exportData[0] || {}).map(k => ({ wch: k.length + 5 }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Course_Grades");
    XLSX.writeFile(wb, `${selectedCourse.code}_Grades_Export.xlsx`);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCourse || !activeBatch || !newStudentId || !newStudentName) return;
      
      const cleanSid = cleanId(newStudentId);
      if (students.some(s => cleanId(s.studentId) === cleanSid)) {
          alert('This Student ID already exists in the roster.');
          return;
      }

      const res: StudentResult = {
          id: `${selectedCourse.id}_${cleanSid}`,
          studentId: cleanSid,
          studentName: newStudentName,
          program: newStudentProgram,
          courseId: selectedCourse.id,
          batchId: activeBatch.id,
          quizScores: Array(selectedCourse.config.quizCount).fill(null),
          assignmentScores: Array(selectedCourse.config.assignmentCount).fill(null),
          bonusScore: null,
          calculatedTotal: 0
      };
      
      setStudents(prev => [...prev, res]);
      saveResultBackground(res);
      setNewStudentId('');
      setNewStudentName('');
  };

  const handleRosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourse || !activeBatch) return;

    setUploadType('ROSTER');
    setUploadStatus(null);
    setUploadPreviewData(null);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = async (evt: ProgressEvent<FileReader>) => {
        try {
            // 1. Read as ArrayBuffer for reliable encoding
            const arrayBuffer = evt.target?.result;
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            
            // 2. Parse as Matrix (Header: 1) for positional access
            const gridData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            if (gridData.length < 2) {
                setUploadStatus({ msg: 'File appears empty or missing header row.', type: 'error' });
                return;
            }

            // 3. Heuristic Header Detection
            let headerRowIdx = 0;
            const idKeywords = ['id', 'student id', 'code', 'no.', 'رقم', 'glos'];
            const nameKeywords = ['name', 'student', 'الاسم', 'طالب', 'full name'];
            const programKeywords = ['prog', 'major', 'track', 'dept', 'special', 'البرنامج', 'التخصص', 'القسم', 'الشعبة', 'المسار', 'department', 'specialization'];
            
            for(let r=0; r<Math.min(gridData.length, 5); r++) {
                 const rowStr = gridData[r].map(c => String(c).toLowerCase().trim());
                 if (rowStr.some(c => idKeywords.some(k => c.includes(k)))) {
                     headerRowIdx = r;
                     break;
                 }
            }

            const headers = gridData[headerRowIdx].map(h => String(h).trim().toLowerCase());
            
            // FIX: Prevent Name column from grabbing the ID column (overlap with 'student' keyword)
            
            // 1. Find ID Column first
            let idIdx = headers.findIndex(h => idKeywords.some(k => h.includes(k)));
            
            // 2. Find Name Column (BUT IGNORE THE ID COLUMN)
            let nameIdx = headers.findIndex((h, i) => {
                if (i === idIdx) return false; // Critical Fix: Do not select the same column as ID
                return nameKeywords.some(k => h.includes(k));
            });

            // 3. Find Program Column (BUT IGNORE ID and NAME columns)
            let progIdx = headers.findIndex((h, i) => {
                if (i === idIdx || i === nameIdx) return false;
                return programKeywords.some(k => h.includes(k));
            });

            // Fallbacks
            if (idIdx === -1) idIdx = 0; 
            if (nameIdx === -1) {
                // If ID is 0, default Name to 1. If ID is 1, default Name to 0.
                nameIdx = idIdx === 0 ? 1 : 0;
            }
            // Fallback for program to column 2 (3rd column) if not explicitly found by name
            if (progIdx === -1 && headers.length > 2) {
                // Pick a column that is neither ID nor Name
                for (let i = 0; i < Math.min(headers.length, 5); i++) {
                    if (i !== idIdx && i !== nameIdx) {
                        progIdx = i;
                        break;
                    }
                }
            }

            // 4. Data Extraction
            const mappedData = gridData.slice(headerRowIdx + 1).map(row => {
                const sid = cleanId(row[idIdx]);
                const sname = String(row[nameIdx] || '').trim();
                
                // --- EXACT PROGRAM EXTRACTION ---
                // NO DEFAULT FALLBACKS TO 'GENERAL'
                
                let prog = '';
                
                // 1. Try the identified column index
                if (progIdx !== -1 && row[progIdx] !== undefined) {
                    prog = String(row[progIdx]).trim();
                }
                
                // 2. Fallback: If empty, check typical columns (2, 3, 4) if valid text found
                if (!prog && row.length > 2) {
                     // Check col 2, 3, 4. Avoid current id/name cols.
                     const candidates = [2, 3, 4].map(i => i !== idIdx && i !== nameIdx ? row[i] : null);
                     const bestCandidate = candidates.find(c => c && String(c).length > 2 && !String(c).match(/^\d+$/)); // Must be text, length > 2
                     if (bestCandidate) prog = String(bestCandidate).trim();
                }

                // NO DEFAULT 'General' Assignment here anymore.
                // If it is empty, it remains empty string.

                return {
                    studentId: sid,
                    studentName: sname,
                    program: prog,
                    isValid: sid && sname && sid !== 'undefined'
                };
            }).filter((r: any) => r.isValid);

            if (mappedData.length > 0) {
                setUploadPreviewData(mappedData);
            } else {
                setUploadStatus({ msg: 'No valid student data found. Please check columns.', type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setUploadStatus({ msg: 'Failed to process file.', type: 'error' });
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const confirmRosterUpload = async () => {
      if (!uploadPreviewData || !selectedCourse || !activeBatch) return;
      setIsProcessingUpload(true);

      const studentMap = new Map(students.map(s => [cleanId(s.studentId), s] as [string, StudentResult]));
      const studentsToSave: StudentResult[] = [];

      uploadPreviewData.forEach((row: any, idx: number) => {
          const sid = cleanId(row.studentId);
          const existing = studentMap.get(sid);
          if (existing) {
              const updated = { ...(existing as StudentResult), studentName: row.studentName, program: row.program, orderIndex: idx };
              studentMap.set(sid, updated);
              studentsToSave.push(updated);
          } else {
              const newStudent: StudentResult = {
                  id: `${selectedCourse.id}_${sid}`,
                  studentId: sid,
                  studentName: row.studentName,
                  program: row.program,
                  courseId: selectedCourse.id,
                  batchId: activeBatch.id,
                  quizScores: Array(selectedCourse.config.quizCount).fill(null),
                  assignmentScores: Array(selectedCourse.config.assignmentCount).fill(null),
                  bonusScore: null,
                  calculatedTotal: 0,
                  orderIndex: idx
              };
              studentMap.set(sid, newStudent);
              studentsToSave.push(newStudent);
          }
      });

      setStudents(Array.from(studentMap.values()));

      const CHUNK_SIZE = 10;
      const chunks = [];
      for (let i = 0; i < studentsToSave.length; i += CHUNK_SIZE) {
          chunks.push(studentsToSave.slice(i, i + CHUNK_SIZE));
      }

      try {
          for (let i = 0; i < chunks.length; i++) {
              await bulkSaveResults(chunks[i]);
              setUploadProgress(Math.round(((i + 1) / chunks.length) * 100));
          }
          await fetchLatestData(selectedCourse.id);
          setUploadStatus({ msg: `Roster processed: ${studentsToSave.length} students synced.`, type: 'success' });
          setTimeout(() => setUploadPreviewData(null), 1500); 
      } catch (e) {
          setUploadStatus({ msg: 'Network error during save. Please retry.', type: 'error' });
      } finally {
          setIsProcessingUpload(false);
          setUploadProgress(0);
      }
  };

  // --- Single Upload Functions ---

  const getTargetLabel = (targetStr: string) => {
      if (targetStr === 'bonus') return 'Bonus Score';
      if (!targetStr) return 'Unknown';
      const parts = targetStr.split('-');
      if (parts.length < 2) return 'Unknown';
      
      const type = parts[0];
      const index = parseInt(parts[1]);
      if (type === 'quiz') return `Quiz ${index + 1}`;
      if (type === 'assignment') return `Assignment ${index + 1}`;
      return 'Unknown';
  };

  const normalizePreviewRow = (row: any) => {
      const studentId = cleanId(
          row?.studentId ??
          row?.studentID ??
          row?.StudentID ??
          row?.['Student ID'] ??
          row?.id ??
          row?.ID
      );
      const studentName = String(
          row?.studentName ??
          row?.StudentName ??
          row?.['Student Name'] ??
          row?.name ??
          row?.Name ??
          '-'
      ).trim();
      const program = String(row?.program ?? row?.Program ?? row?.['Program'] ?? '-').trim();
      const grade = row?.grade ?? row?.Grade ?? row?.Score ?? row?.['Grade'] ?? row?.['Score'] ?? '-';

      return { studentId, studentName, program, grade };
  };

  const handleDownloadSingleTemplate = () => {
      if (!selectedCourse) return;
      const targetLabel = getTargetLabel(singleTarget);

      const templateData = students.map(s => ({
          'Student ID': s.studentId,
          'Student Name': s.studentName,
          [targetLabel]: '' 
      }));

      if (templateData.length === 0) {
          templateData.push({
              'Student ID': '2024001',
              'Student Name': 'Example Student',
              [targetLabel]: ''
          } as any);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wscols = [{wch: 15}, {wch: 30}, {wch: 15}];
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, "Grades");
      XLSX.writeFile(wb, `${selectedCourse.code}_${targetLabel.replace(' ', '')}_Template.xlsx`);
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedCourse) return;
      
      setUploadType('SINGLE');
      setUploadStatus(null);
      setUploadPreviewData(null);
      setUploadProgress(0);

      const targetLabel = getTargetLabel(singleTarget);

      const reader = new FileReader();
      reader.onload = (evt: ProgressEvent<FileReader>) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws) as any[];
              
              const mappedData = data.map((row: any) => {
                  const normalizedRow: any = {};
                  Object.keys(row).forEach(k => normalizedRow[k.trim()] = row[k]);

                  let studentId = cleanId(normalizedRow['Student ID'] || normalizedRow['ID'] || normalizedRow['id']);
                  
                  let gradeVal = normalizedRow[targetLabel];
                  if (gradeVal === undefined) gradeVal = normalizedRow['Grade'] || normalizedRow['Score'] || normalizedRow['الدرجة'];
                  
                  if (gradeVal === undefined) {
                      const possibleKeys = Object.keys(normalizedRow).filter(k => !['Student ID', 'ID', 'id', 'Student Name', 'Name', 'name'].includes(k));
                      if (possibleKeys.length === 1) gradeVal = normalizedRow[possibleKeys[0]];
                  }

                  const existingStudent = students.find(s => cleanId(s.studentId) === studentId);
                  
                  return {
                      studentId, 
                      studentName: existingStudent?.studentName || 'Unknown / Not in Roster',
                      grade: gradeVal,
                      isValid: existingStudent && gradeVal !== undefined && gradeVal !== null && String(gradeVal).trim() !== '',
                      originalRow: row,
                  };
              }).filter((d: any) => d.isValid);

              if (mappedData.length > 0) {
                setUploadPreviewData(mappedData);
              } else {
                setUploadStatus({ msg: 'No matching students found. Ensure IDs match the Roster.', type: 'error' });
              }

          } catch (err) {
              setUploadStatus({ msg: 'Failed to process file.', type: 'error' });
          }
      };
      reader.readAsBinaryString(file);
      e.target.value = '';
  };

  const confirmSingleUpload = async () => {
      if (!uploadPreviewData || !selectedCourse) return;

      setIsProcessingUpload(true);
      const [type, idxStr] = singleTarget.split('-');
      const index = parseInt(idxStr);
      
      const studentsToUpdate: StudentResult[] = [];
      const tempStudentsMap = new Map<string, StudentResult>(students.map(s => [cleanId(s.studentId), s]));

      uploadPreviewData.forEach((item: any) => {
          const sid = cleanId(item.studentId);
          const s = tempStudentsMap.get(sid);
          
          if (s) {
               const updatedS: StudentResult = JSON.parse(JSON.stringify(s));
               const numVal = parseFloat(item.grade);
               
               if (!isNaN(numVal)) {
                   if (singleTarget === 'bonus') {
                       updatedS.bonusScore = numVal;
                   } else if (type === 'quiz') {
                       updatedS.quizScores = Array.isArray(updatedS.quizScores) ? updatedS.quizScores : [];
                       updatedS.quizScores[index] = numVal;
                   } else if (type === 'assignment') {
                       updatedS.assignmentScores = Array.isArray(updatedS.assignmentScores) ? updatedS.assignmentScores : [];
                       updatedS.assignmentScores[index] = numVal;
                   }

                   updatedS.calculatedTotal = calculateStudentGrade(
                       updatedS.quizScores, 
                       updatedS.assignmentScores, 
                       updatedS.bonusScore, 
                       selectedCourse.config
                   );

                   if (updatedS.id === s.id) {
                       studentsToUpdate.push(updatedS);
                   }
               }
          }
      });

      const CHUNK_SIZE = 10; 
      const chunks = [];
      for (let i = 0; i < studentsToUpdate.length; i += CHUNK_SIZE) {
          chunks.push(studentsToUpdate.slice(i, i + CHUNK_SIZE));
      }

      try {
          for (let i = 0; i < chunks.length; i++) {
              await bulkSaveResults(chunks[i]);
              setUploadProgress(Math.round(((i + 1) / chunks.length) * 100));
          }
          await fetchLatestData(selectedCourse.id);
          setUploadStatus({ msg: `Grades updated for ${studentsToUpdate.length} students.`, type: 'success' });
          setTimeout(() => setUploadPreviewData(null), 1500);
      } catch (e) {
          setUploadStatus({ msg: 'Error during sync.', type: 'error' });
      } finally {
          setIsProcessingUpload(false);
          setUploadProgress(0);
      }
  };

  // --- Turbo Mode ---

  const getTurboStats = useMemo(() => {
      if (!selectedCourse) return { total: 0, graded: 0, percentage: 0 };
      const total = students.length;
      if (total === 0) return { total: 0, graded: 0, percentage: 0 };

      const graded = students.filter(s => {
          const score = turboContext.type === 'quiz' 
              ? s.quizScores?.[turboContext.index] 
              : s.assignmentScores?.[turboContext.index];
          return score !== null && score !== undefined && (score as any) !== '';
      }).length;

      return { total, graded, percentage: Math.round((graded / total) * 100) };
  }, [students, turboContext, selectedCourse]);

  const filteredTurboStudents = useMemo(() => {
      if (!turboSearch) return [];
      const normalizedSearch = normalizeArabic(turboSearch.toLowerCase());
      
      return students.filter(s => {
          const normalizedName = normalizeArabic(s.studentName.toLowerCase());
          return normalizedName.includes(normalizedSearch) || String(s.studentId).includes(turboSearch);
      }).slice(0, 5); 
  }, [turboSearch, students]);

  const sidebarStudents = useMemo(() => {
      return students.filter(s => {
          const score = turboContext.type === 'quiz' 
              ? s.quizScores?.[turboContext.index] 
              : s.assignmentScores?.[turboContext.index];
          const isGraded = score !== null && score !== undefined && (score as any) !== '';
          
          if (sidebarFilter === 'PENDING') return !isGraded;
          if (sidebarFilter === 'COMPLETED') return isGraded;
          return true;
      });
  }, [students, sidebarFilter, turboContext]);

  const handleSelectTurboStudent = (student: StudentResult) => {
      if (student.isLocked || isReadOnly) return;
      
      const currentVal = turboContext.type === 'quiz' 
          ? student.quizScores?.[turboContext.index] 
          : student.assignmentScores?.[turboContext.index];
      
      setTurboSelectedStudentId(student.id);
      setTurboGradeInput(currentVal === null || currentVal === undefined ? '' : String(currentVal));
      setTimeout(() => turboGradeInputRef.current?.focus(), 50);
  };

  const handleSaveTurboGrade = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && selectedCourse && turboSelectedStudentId) {
          e.preventDefault();
          const studentIndex = students.findIndex(s => s.id === turboSelectedStudentId);
          if (studentIndex === -1) return;

          const student = students[studentIndex];
          
          // Reusing the same helper logic for turbo
          handleLocalChange(student, turboContext.type === 'quiz' ? 'quiz' : 'assign', turboContext.index, turboGradeInput);

          setTurboSelectedStudentId(null);
          setTurboSearch('');
          setTurboGradeInput('');
          setTimeout(() => turboSearchInputRef.current?.focus(), 100);
      }
  };

  useEffect(() => {
      if (activeTab === 'TURBO') {
          setTimeout(() => turboSearchInputRef.current?.focus(), 100);
      }
  }, [activeTab]);

  // --- Grid View Stats ---
  const gridStats = useMemo(() => {
      if (!students.length) return { total: 0, absenceRate: 0 };
      const total = students.length;
      let totalCells = 0;
      let absentCells = 0;
      
      students.forEach(s => {
          if (Array.isArray(s.quizScores)) {
              s.quizScores.forEach(q => {
                 totalCells++;
                 if (q === null || q === undefined || (q as any) === '') absentCells++;
              });
          }
          if (Array.isArray(s.assignmentScores)) {
              s.assignmentScores.forEach(a => {
                 totalCells++;
                 if (a === null || a === undefined || (a as any) === '') absentCells++;
              });
          }
      });
      
      return {
          total,
          absenceRate: totalCells > 0 ? Math.round((absentCells / totalCells) * 100) : 0
      };
  }, [students, selectedCourse]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-fade-in-up relative z-10">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-wrap items-center justify-between gap-4 shrink-0 relative overflow-visible z-20">
         <div className={`flex items-center gap-5 relative ${isCourseMenuOpen ? 'z-30' : 'z-10'}`}>
             <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-[24px] shadow-lg shadow-indigo-200/50"><FileSpreadsheet size={28} strokeWidth={2.5} /></div>
             <div>
                 <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">Grade Center</h1>
                <div ref={courseMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCourseMenuOpen(prev => !prev)}
                      className={`min-w-[240px] md:min-w-[280px] w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-white text-left transition-all ${
                        isCourseMenuOpen
                          ? 'border-indigo-300 ring-4 ring-indigo-100'
                          : 'border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <span className="truncate text-sm font-black text-slate-700">
                        {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'Select a Course...'}
                      </span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2.5}
                        className={`text-slate-400 transition-transform ${isCourseMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isCourseMenuOpen && (
                      <div className="absolute left-0 right-0 mt-2 z-40 bg-white border border-slate-200 rounded-xl shadow-[0_14px_30px_rgba(15,23,42,0.15)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseId('');
                            setIsCourseMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          Select a Course...
                        </button>
                        <div className="max-h-64 overflow-auto border-t border-slate-100">
                          {allowedCourses.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCourseId(String(c.id));
                                setIsCourseMenuOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors ${
                                String(c.id) === String(selectedCourseId)
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                              }`}
                            >
                              <span className="truncate block">{c.code} - {c.name}</span>
                            </button>
                          ))}
                          {allowedCourses.length === 0 && (
                            <div className="px-4 py-3 text-sm font-bold text-slate-400">
                              No courses available
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
             </div>
         </div>
         {selectedCourse && (
             <div className="flex items-center gap-4 relative z-10">
                 <button
                    onClick={() => selectedCourse && fetchLatestData(selectedCourse.id)}
                    disabled={isLoading || !selectedCourse}
                    className="p-3 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-[20px] transition-all shadow-sm active:scale-95"
                    title="Force Refresh Data"
                 >
                    <RefreshCw size={20} strokeWidth={2.5} className={isLoading ? "animate-spin text-indigo-500" : ""} />
                 </button>
                 <button
                    onClick={handleExportGrid}
                    className="flex items-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-[20px] text-xs font-black shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all active:scale-95"
                 >
                    <Download size={18} strokeWidth={2.5} /> Export Excel
                 </button>
                 <button 
                    onClick={() => navigate(`/print-marklist/${selectedCourse.id}`)}
                    className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white px-5 py-3 rounded-[20px] text-xs font-black shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all active:scale-95"
                 >
                    <Printer size={18} strokeWidth={2.5} /> Print Marklist
                 </button>
                 <div className="flex bg-slate-100/80 backdrop-blur-sm p-1.5 rounded-[20px] border border-slate-200/50 shadow-inner">
                    <button onClick={() => setActiveTab('GRID')} className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[11px] uppercase tracking-widest font-black transition-all ${activeTab === 'GRID' ? 'bg-white shadow-sm text-indigo-700 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Layout size={16} strokeWidth={2.5}/> Grid
                    </button>
                    {!isReadOnly && (
                        <button onClick={() => setActiveTab('TURBO')} className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[11px] uppercase tracking-widest font-black transition-all ${activeTab === 'TURBO' ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Zap size={16} strokeWidth={2.5}/> Turbo
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={() => setActiveTab('SINGLE')} className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[11px] uppercase tracking-widest font-black transition-all ${activeTab === 'SINGLE' ? 'bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Upload size={16} strokeWidth={2.5}/> Single
                        </button>
                    )}
                    {!isReadOnly && (
                        <button onClick={() => setActiveTab('ROSTER')} className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-[11px] uppercase tracking-widest font-black transition-all ${activeTab === 'ROSTER' ? 'bg-white shadow-sm text-indigo-700 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
                            <List size={16} strokeWidth={2.5}/> Roster
                        </button>
                    )}
                 </div>
             </div>
         )}
      </div>

      {!selectedCourse ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[32px] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-[24px] flex items-center justify-center mb-6 shadow-sm"><Layout size={32} className="text-slate-400" strokeWidth={2}/></div>
              <h3 className="text-xl font-black text-slate-800">No Course Selected</h3>
              <p className="text-slate-500 font-bold mt-2 text-sm">Please select a course to begin grading</p>
          </div>
      ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[32px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" strokeWidth={2.5} />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Retrieving Records</h3>
              <p className="text-slate-500 font-bold mt-2 text-sm">Synchronizing with central database</p>
          </div>
      ) : (
          <div className="flex-1 min-h-0 bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden flex flex-col relative">
              



              {/* --- GRID TAB (Standard) --- */}
              {activeTab === 'GRID' && safeConfig && (
                  <div className="flex-1 overflow-auto flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-30 shrink-0">
                          <div className="relative w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input value={gridSearchQuery} onChange={e => setGridSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-100 focus:bg-white" placeholder="Search by name or ID..." />
                          </div>
                          <div className="flex items-center gap-6">
                             {/* Stats Bar */}
                             <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                 <div className="flex flex-col items-center leading-none">
                                     <span className="text-[10px] font-black text-slate-400 uppercase">Students</span>
                                     <span className="font-bold text-slate-800">{gridStats.total}</span>
                                 </div>
                                 <div className="w-px h-6 bg-slate-200"></div>
                                 <div className="flex flex-col items-center leading-none">
                                     <span className="text-[10px] font-black text-slate-400 uppercase">Absence</span>
                                     <span className={`font-bold ${gridStats.absenceRate > 20 ? 'text-rose-500' : 'text-emerald-600'}`}>{gridStats.absenceRate}%</span>
                                 </div>
                             </div>

                             <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Best {safeConfig.quizBestOf} Quizzes</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Best {safeConfig.assignmentBestOf} Assig.</span>
                             </div>
                             <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                Target: {safeConfig.totalTargetScore} pts
                             </div>
                          </div>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-50 sticky top-0 z-20">
                                <tr>
                                    <th className="p-4 text-left border-b border-r border-slate-200 min-w-[250px] w-64 sticky left-0 bg-slate-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">Student</th>
                                    {Array.from({length: safeConfig.quizCount}).map((_, i) => (
                                        <th key={i} className="p-3 text-center border-b border-r border-slate-100 text-[9px] font-black group transition-colors hover:bg-indigo-100 min-w-[60px]">
                                            Q{i+1}
                                            <span className="block text-[8px] text-indigo-400 mt-0.5">Max: {safeConfig.quizIndividualMaxScores[i] || safeConfig.quizMaxScore}</span>
                                        </th>
                                    ))}
                                    <th className="p-3 text-center border-b border-r border-slate-100 bg-indigo-50 text-[10px] font-black text-indigo-700 min-w-[70px]">Quiz Σ</th>
                                    {Array.from({length: safeConfig.assignmentCount}).map((_, i) => (
                                        <th key={i} className="p-3 text-center border-b border-r border-slate-100 text-[9px] font-black hover:bg-emerald-100 transition-colors min-w-[60px]">
                                            A{i+1}
                                            <span className="block text-[8px] text-emerald-400 mt-0.5">Max: {safeConfig.assignmentIndividualMaxScores[i] || safeConfig.assignmentMaxScore}</span>
                                        </th>
                                    ))}
                                    <th className="p-3 text-center border-b border-r border-slate-100 bg-emerald-50 text-[10px] font-black text-emerald-700 min-w-[70px]">Assig Σ</th>
                                    {safeConfig.enableBonus && <th className="p-3 text-center border-b border-slate-100 text-[10px] font-black text-amber-600 min-w-[60px]">Bonus</th>}
                                    <th className="p-4 text-center border-b border-l border-slate-200 bg-slate-100 sticky right-0 text-[10px] font-black min-w-[80px]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredGridStudents.map(s => (
                                    <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-4 border-r border-slate-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-bold text-slate-800 text-xs mb-0.5 whitespace-normal break-words">{s.studentName}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded leading-none">{s.studentId}</span>
                                                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded">
                                                            {s.program || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button onClick={() => {
                                                    const lockedS = {...s, isLocked: !s.isLocked};
                                                    setStudents(prev => prev.map(st => st.id === s.id ? lockedS : st));
                                                    saveResultBackground(lockedS);
                                                }} className={`p-2 rounded-lg transition-all shrink-0 ${s.isLocked ? 'text-rose-500 bg-rose-50' : 'text-slate-200 hover:text-slate-400'}`}>
                                                    {s.isLocked ? <Lock size={12}/> : <Unlock size={12}/>}
                                                </button>
                                            </div>
                                        </td>
                                        {Array.from({length: safeConfig.quizCount}).map((_, idx) => (
                                            <td key={idx} className="p-3 border-r border-slate-50">
                                                <input 
                                                    disabled={isReadOnly || s.isLocked}
                                                    className="w-full h-8 text-center bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-600 transition-all placeholder-slate-200"
                                                    value={(s.quizScores && s.quizScores[idx] !== null) ? s.quizScores[idx]! : ''}
                                                    placeholder="-"
                                                    onChange={e => handleLocalChange(s, 'quiz', idx, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 border-r border-slate-100 bg-indigo-50/30 text-center font-black text-indigo-700 text-xs">
                                            {isAllAbs(s.quizScores) ? 'Abs' : calculateStudentGrade(s.quizScores, Array(selectedCourse.config.assignmentCount).fill(0), 0, {...selectedCourse.config, assignmentMaxScore: 0, enableBonus: false})}
                                        </td>
                                        {Array.from({length: safeConfig.assignmentCount}).map((_, idx) => (
                                            <td key={idx} className="p-3 border-r border-slate-50">
                                                <input 
                                                    disabled={isReadOnly || s.isLocked}
                                                    className="w-full h-8 text-center bg-transparent border-b-2 border-transparent focus:border-emerald-500 outline-none font-bold text-slate-600 transition-all placeholder-slate-200"
                                                    value={(s.assignmentScores && s.assignmentScores[idx] !== null) ? s.assignmentScores[idx]! : ''}
                                                    placeholder="-"
                                                    onChange={e => handleLocalChange(s, 'assign', idx, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 border-r border-slate-100 bg-emerald-50/30 text-center font-black text-emerald-700 text-xs">
                                            {isAllAbs(s.assignmentScores) ? 'Abs' : calculateStudentGrade(Array(selectedCourse.config.quizCount).fill(0), s.assignmentScores, 0, {...selectedCourse.config, quizMaxScore: 0, enableBonus: false})}
                                        </td>
                                        {safeConfig.enableBonus && (
                                            <td className="p-3 border-r border-slate-100 text-center">
                                                <input 
                                                    disabled={isReadOnly || s.isLocked}
                                                    className="w-full h-8 text-center bg-transparent border-b-2 border-transparent focus:border-amber-500 outline-none font-black text-amber-600 transition-all placeholder-amber-100"
                                                    value={s.bonusScore === null ? '' : s.bonusScore}
                                                    placeholder="-"
                                                    onChange={e => handleLocalChange(s, 'bonus', null, e.target.value)}
                                                />
                                            </td>
                                        )}
                                        <td className={`sticky right-0 z-10 p-3 border-l border-slate-200 text-center shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] font-black text-sm ${s.calculatedTotal > safeConfig.totalTargetScore ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-900 group-hover:bg-slate-100'}`}>
                                            {isAllAbs(s.quizScores) && isAllAbs(s.assignmentScores) ? 'Abs' : s.calculatedTotal}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              )}

              {/* --- TURBO MODE CONTENT --- */}
              {activeTab === 'TURBO' && safeConfig && (
                  <div className="flex flex-col h-full relative">
                      {/* Grading Overlay Modal - Portal */}
                      {turboSelectedStudentId && createPortal(
                        (() => {
                          const s = students.find(st => st.id === turboSelectedStudentId);
                          const maxScore = turboContext.type === 'quiz'
                            ? (safeConfig.quizIndividualMaxScores[turboContext.index] || safeConfig.quizMaxScore)
                            : (safeConfig.assignmentIndividualMaxScores[turboContext.index] || safeConfig.assignmentMaxScore);
                          return (
                            <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:99999,background:'rgba(2,6,23,0.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} className="animate-fade-in" onClick={() => setTurboSelectedStudentId(null)}>
                              <div style={{width:'100%',maxWidth:'460px',borderRadius:'28px',overflow:'hidden',boxShadow:'0 25px 60px -12px rgba(0,0,0,0.5)'}} className="animate-scale-up" onClick={e => e.stopPropagation()}>
                                {/* Student Header */}
                                <div style={{background:'linear-gradient(145deg,#4f46e5 0%,#6366f1 50%,#818cf8 100%)',padding:'32px 28px 28px',position:'relative',overflow:'hidden'}}>
                                  <div style={{position:'absolute',top:'-30px',right:'-30px',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}></div>
                                  <div style={{position:'absolute',bottom:'-20px',left:'-20px',width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}></div>
                                  <button onClick={() => setTurboSelectedStudentId(null)} style={{position:'absolute',top:'14px',right:'14px',width:'36px',height:'36px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'12px',cursor:'pointer',color:'rgba(255,255,255,0.8)',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
                                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',position:'relative',zIndex:1}}>
                                    <div style={{width:'60px',height:'60px',background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.2)',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',fontWeight:900,color:'#fff'}}>{s?.studentName?.trim().charAt(0)}</div>
                                    <div style={{textAlign:'center'}}>
                                      <div style={{fontSize:'20px',fontWeight:800,color:'#fff',lineHeight:1.4,wordBreak:'break-word',maxWidth:'350px'}} dir="auto">{s?.studentName}</div>
                                      <div style={{fontSize:'13px',color:'rgba(255,255,255,0.55)',marginTop:'2px',fontWeight:500,letterSpacing:'0.5px'}}>{s?.studentId}</div>
                                    </div>
                                  </div>
                                </div>
                                {/* Grade Input */}
                                <div style={{background:'#ffffff',padding:'36px 32px 32px'}}>
                                  <div style={{position:'relative',marginBottom:'16px'}}>
                                    <input
                                      ref={turboGradeInputRef}
                                      type="text"
                                      inputMode="decimal"
                                      value={turboGradeInput}
                                      onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setTurboGradeInput(v); }}
                                      onKeyDown={handleSaveTurboGrade}
                                      placeholder="0"
                                      autoFocus
                                      style={{width:'100%',height:'100px',textAlign:'center',fontSize:'64px',fontWeight:900,color:'#4f46e5',background:'linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)',borderRadius:'20px',border:'2px solid #e0e7ff',outline:'none',boxShadow:'inset 0 2px 8px rgba(99,102,241,0.06), 0 1px 3px rgba(0,0,0,0.04)',caretColor:'#6366f1',letterSpacing:'-1px'}}
                                    />
                                  </div>
                                  <div style={{textAlign:'center',marginBottom:'24px'}}>
                                    <span style={{display:'inline-block',fontSize:'11px',fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'3px',background:'#f1f5f9',padding:'6px 16px',borderRadius:'8px'}}>out of {maxScore}</span>
                                  </div>
                                  <button
                                    onClick={() => handleSaveTurboGrade({ key: 'Enter', preventDefault: () => {} } as any)}
                                    style={{width:'100%',height:'54px',background:'linear-gradient(145deg,#4f46e5 0%,#6366f1 100%)',color:'#fff',border:'none',borderRadius:'16px',fontSize:'15px',fontWeight:800,cursor:'pointer',boxShadow:'0 4px 16px rgba(79,70,229,0.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',letterSpacing:'0.3px'}}
                                  >Save & Next <span style={{opacity:0.5,fontSize:'12px',marginLeft:'4px'}}>Enter</span></button>
                                </div>
                              </div>
                            </div>
                          );
                        })(),
                        document.body
                      )}

                      {/* Top Bar: Progress & Context */}
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div className="flex items-center gap-6">
                              <div className="relative">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Target size={16}/></div>
                                  <select 
                                      className="pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 appearance-none cursor-pointer shadow-sm hover:border-indigo-200 transition-colors"
                                      value={`${turboContext.type}-${turboContext.index}`}
                                      onChange={(e) => {
                                          const [type, idxStr] = e.target.value.split('-');
                                          setTurboContext({ type: type as any, index: parseInt(idxStr) });
                                      }}
                                  >
                                      {Array.from({length: safeConfig.quizCount}).map((_, i) => (
                                          <option key={`q-${i}`} value={`quiz-${i}`}>Quiz {i+1}</option>
                                      ))}
                                      {Array.from({length: safeConfig.assignmentCount}).map((_, i) => (
                                          <option key={`a-${i}`} value={`assignment-${i}`}>Assignment {i+1}</option>
                                      ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                              </div>
                              
                              <div className="flex items-center gap-4">
                                  <div className="w-48 h-3 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                          className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
                                          style={{ width: `${getTurboStats.percentage}%` }}
                                      ></div>
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-black text-indigo-600">{getTurboStats.percentage}%</span>
                                      <span className="text-xs font-bold text-slate-400 uppercase">Complete</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-1 overflow-hidden">
                          {/* Center: Rapid Search Area */}
                          <div className="flex-1 flex flex-col items-center justify-start pt-10 sm:pt-20 relative bg-slate-50/30 overflow-y-auto">
                              <div className="w-full max-w-xl space-y-6 animate-fade-in px-6 pb-20">
                                  <div className="text-center space-y-2 mb-8">
                                      <h2 className="text-3xl font-black text-slate-900">Rapid Grading</h2>
                                      <p className="text-slate-400 font-bold">Search student, Press Enter, Grade.</p>
                                  </div>
                                  
                                  <div className="relative group">
                                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500">
                                          <Search size={28} />
                                      </div>
                                      <input 
                                          ref={turboSearchInputRef}
                                          value={turboSearch}
                                          onChange={e => setTurboSearch(e.target.value)}
                                          onKeyDown={e => {
                                              if (e.key === 'Enter' && filteredTurboStudents.length > 0) {
                                                  handleSelectTurboStudent(filteredTurboStudents[0]);
                                              }
                                          }}
                                          className="w-full pl-16 pr-6 py-6 bg-white border-2 border-indigo-100 rounded-[28px] text-2xl font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-xl shadow-indigo-50 placeholder:text-slate-200"
                                          placeholder="Type Name or ID..."
                                          autoFocus
                                      />
                                      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                          <span className="bg-slate-100 text-slate-400 text-[10px] font-black uppercase px-2 py-1 rounded">Enter ↵</span>
                                      </div>
                                  </div>

                                  {turboSearch && (
                                      <div className="space-y-2 pt-4">
                                          {filteredTurboStudents.map((s, idx) => {
                                              const score = turboContext.type === 'quiz' ? s.quizScores?.[turboContext.index] : s.assignmentScores?.[turboContext.index];
                                              const isGraded = score !== null && score !== undefined && (score as any) !== '';
                                              
                                              return (
                                                  <button 
                                                      key={s.id}
                                                      onClick={() => handleSelectTurboStudent(s)}
                                                      className={`w-full p-4 bg-white border rounded-2xl flex items-center justify-between hover:shadow-md transition-all group ${idx === 0 ? 'ring-2 ring-indigo-100 border-indigo-500' : 'border-slate-100'}`}
                                                  >
                                                      <div className="flex items-center gap-4 min-w-0 flex-1">
                                                          <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                              {s.studentName.trim().charAt(0)}
                                                          </div>
                                                          <div className="min-w-0 flex-1 text-left" dir="auto">
                                                              <p className="font-bold text-slate-800 text-lg truncate">{s.studentName}</p>
                                                              <p className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded w-fit truncate">{s.studentId}</p>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center gap-3 shrink-0 ml-4">
                                                          {isGraded && <span className="text-emerald-500 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-lg">{score}</span>}
                                                          <ArrowRight size={20} className={`${idx === 0 ? 'text-indigo-500' : 'text-slate-200'}`} />
                                                      </div>
                                                  </button>
                                              )
                                          })}
                                          {filteredTurboStudents.length === 0 && (
                                              <div className="text-center p-4 text-slate-400 font-bold">No students found</div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Right: Smart Sidebar */}
                          <div className="w-80 border-l border-slate-100 bg-white flex flex-col hidden xl:flex">
                              <div className="p-4 border-b border-slate-50">
                                  <div className="flex p-1 bg-slate-100 rounded-xl mb-2">
                                      {(['ALL', 'PENDING', 'COMPLETED'] as SidebarFilter[]).map((f) => (
                                          <button
                                              key={f}
                                              onClick={() => setSidebarFilter(f)}
                                              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${sidebarFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          >
                                              {f === 'ALL' ? 'All' : f === 'PENDING' ? 'To Do' : 'Done'}
                                          </button>
                                      ))}
                                  </div>
                                  <div className="text-center text-xs font-bold text-slate-400">
                                      Showing {sidebarStudents.length} Students
                                  </div>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                                  {sidebarStudents.map(s => {
                                      const score = turboContext.type === 'quiz' ? s.quizScores?.[turboContext.index] : s.assignmentScores?.[turboContext.index];
                                      const isGraded = score !== null && score !== undefined && (score as any) !== '';
                                      const isSelected = s.id === turboSelectedStudentId;
                                      
                                      return (
                                          <button 
                                            key={s.id} 
                                            onClick={() => handleSelectTurboStudent(s)}
                                            className={`w-full p-3 flex items-center justify-between text-left transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                          >
                                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                                  <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-bold ${isGraded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                      {isGraded ? <Check size={14} strokeWidth={3} /> : <Circle size={14} />}
                                                  </div>
                                                  <div className="min-w-0 flex-1" dir="auto">
                                                      <p className={`text-xs font-bold truncate ${isGraded ? 'text-slate-600' : 'text-slate-800'}`}>{s.studentName}</p>
                                                      <p className="text-[10px] font-medium text-slate-400 truncate">{s.studentId}</p>
                                                  </div>
                                              </div>
                                              {isGraded && (
                                                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-2">{score}</span>
                                              )}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* --- SINGLE UPLOAD TAB --- */}
              {activeTab === 'SINGLE' && safeConfig && (
                  <div className="flex-1 overflow-auto p-8 relative">
                      <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">
                          <div className="text-center space-y-2">
                              <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Upload size={32} />
                              </div>
                              <h2 className="text-3xl font-black text-slate-900">Single Assessment Upload</h2>
                              <p className="text-slate-500 font-bold">Update grades for a specific quiz or assignment via Excel.</p>
                          </div>

                          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 space-y-8 relative overflow-hidden">
                              {/* Decorative bg */}
                              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50 rounded-bl-[100%] -mr-16 -mt-16 pointer-events-none"></div>

                              <div className="relative z-10 space-y-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">1. Select Target Assessment</label>
                                  <div className="relative">
                                      <select 
                                          value={singleTarget}
                                          onChange={e => setSingleTarget(e.target.value)}
                                          className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-violet-500 appearance-none cursor-pointer"
                                      >
                                          {Array.from({length: safeConfig.quizCount}).map((_, i) => (
                                              <option key={`q-${i}`} value={`quiz-${i}`}>Quiz {i+1}</option>
                                          ))}
                                          {Array.from({length: safeConfig.assignmentCount}).map((_, i) => (
                                              <option key={`a-${i}`} value={`assignment-${i}`}>Assignment {i+1}</option>
                                          ))}
                                          {safeConfig.enableBonus && <option value="bonus">Bonus Score</option>}
                                      </select>
                                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                  <div className="space-y-2">
                                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">2. Get Template</label>
                                      <button 
                                          onClick={handleDownloadSingleTemplate}
                                          className="w-full py-4 bg-white border-2 border-slate-100 hover:border-violet-200 hover:bg-violet-50 text-violet-600 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-sm"
                                      >
                                          <Download size={20} /> Download Excel
                                      </button>
                                      <p className="text-[10px] text-slate-400 font-medium px-1">
                                          *Includes current student IDs and an empty column for <strong>{getTargetLabel(singleTarget)}</strong>.
                                      </p>
                                  </div>

                                  <div className="space-y-2">
                                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">3. Upload Data</label>
                                      <label className="cursor-pointer w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-200 active:scale-95">
                                          <Upload size={20} /> Upload Filled File
                                          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleSingleFileUpload} />
                                      </label>
                                  </div>
                              </div>
                          </div>

                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center">
                              <p className="text-sm text-slate-500 font-bold">
                                  <span className="text-violet-600">Tip:</span> Only the grade column for the selected assessment will be updated. Other scores remain unchanged.
                              </p>
                          </div>
                      </div>
                  </div>
              )}

              {/* --- ROSTER TAB --- */}
              {activeTab === 'ROSTER' && safeConfig && (
                  <div className="flex-1 overflow-auto p-8">
                      <div className="max-w-4xl mx-auto space-y-8">
                          {/* Manual Add */}
                          <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100">
                             <h3 className="text-lg font-black text-indigo-900 mb-6 flex items-center gap-2"><UserPlus size={20}/> Add Students to Roster</h3>
                             <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Student ID</label>
                                    <input required value={newStudentId} onChange={e => setNewStudentId(e.target.value)} className="w-full bg-white p-3 rounded-xl border border-indigo-200 font-bold outline-none" placeholder="2024001" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input required value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full bg-white p-3 rounded-xl border border-indigo-200 font-bold outline-none" placeholder="Ahmed Ali" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Program</label>
                                    <select value={newStudentProgram} onChange={e => setNewStudentProgram(e.target.value)} className="w-full bg-white p-3 rounded-xl border border-indigo-200 font-bold outline-none appearance-none">
                                        <option value="General">General (عام)</option>
                                        <option value="Accounting">Accounting (محاسبة)</option>
                                        <option value="Management">Management (إدارة)</option>
                                    </select>
                                </div>
                                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    <Plus size={18} /> Add
                                </button>
                             </form>

                             {/* Import Section */}
                             <div className="mt-8 pt-8 border-t border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-white rounded-2xl text-indigo-600"><FileDown size={24} /></div>
                                        <div>
                                            <p className="font-bold text-slate-800">1. Download Template</p>
                                            <p className="text-xs text-slate-500">Get the Excel file structure</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all text-sm"
                                    >
                                        Download .xlsx
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-white rounded-2xl text-emerald-600"><FileUp size={24} /></div>
                                        <div>
                                            <p className="font-bold text-slate-800">2. Upload Roster</p>
                                            <p className="text-xs text-slate-500">Import student data</p>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer flex items-center justify-center w-full py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 text-sm">
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleRosterFileUpload} />
                                        Select Filled File
                                    </label>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                              <h3 className="font-black text-slate-800 flex items-center gap-2"><List size={18} className="text-slate-400"/> Current Roster ({students.length})</h3>
                              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                  <table className="w-full text-right" dir="rtl">
                                      <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase">
                                          <tr>
                                              <th className="px-6 py-4">رقم الجلوس</th>
                                              <th className="px-6 py-4">الاسم</th>
                                              <th className="px-6 py-4">البرنامج</th>
                                              <th className="px-6 py-4">الإجراءات</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                          {students.map(s => (
                                              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                  <td className="px-6 py-4 font-mono font-bold text-slate-600 text-sm">{s.studentId}</td>
                                                  <td className="px-6 py-4 font-bold text-slate-800">{s.studentName}</td>
                                                  <td className="px-6 py-4">
                                                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${s.program === 'Accounting' ? 'bg-amber-50 text-amber-600' : s.program === 'Management' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                                                          {s.program || '-'}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <button onClick={() => deleteResult(s.id, s.courseId)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- UNIFIED PREVIEW MODAL (ROSTER & SINGLE) --- */}
      {uploadPreviewData && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => !isProcessingUpload && setUploadPreviewData(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-up"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '28px',
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.3)',
            }}
          >
            {/* ── Header ── */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {uploadType === 'ROSTER' ? 'Verify Roster Data' : 'Confirm Grade Import'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 font-bold uppercase tracking-wider mt-1.5">
                  {uploadType === 'ROSTER' ? 'Review student list before adding.' : 'Check grades before saving.'}
                </p>
              </div>
              <button disabled={isProcessingUpload} onClick={() => setUploadPreviewData(null)} style={{ flexShrink: 0, padding: '12px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer' }}><X size={20} strokeWidth={2.5}/></button>
            </div>

            {/* ── Scrollable Body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: 0 }}>
              {isProcessingUpload ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '24px', padding: '48px 0' }}>
                  <div style={{ width: '100%', maxWidth: '400px', height: '16px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(to right, #6366f1, #4f46e5)', transition: 'width 0.5s ease-out', width: `${uploadProgress}%` }}></div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{uploadProgress}%</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Updating Database. Please wait.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Records count */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <List size={16} className="text-indigo-500" strokeWidth={2.5} /> Records Found: <span className="text-slate-900 text-base">{uploadPreviewData.length}</span>
                    </span>
                    {uploadType === 'SINGLE' && <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border border-indigo-100">{getTargetLabel(singleTarget)}</span>}
                  </div>

                  {/* Data Table */}
                  <div style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>ID</th>
                          <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Name</th>
                          {uploadType === 'ROSTER' && <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Program</th>}
                          {uploadType === 'SINGLE' && <th style={{ padding: '12px 20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', textAlign: 'right' }}>Grade</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreviewData.slice(0, 100).map((row: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>{row.studentId || '-'}</td>
                            <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0f172a' }}>{row.studentName || '-'}</td>
                            {uploadType === 'ROSTER' && <td style={{ padding: '12px 20px', color: '#475569' }}>{row.program || '-'}</td>}
                            {uploadType === 'SINGLE' && <td style={{ padding: '12px 20px', fontWeight: 900, color: '#4338ca', textAlign: 'right' }}>{row.grade ?? '-'}</td>}
                          </tr>
                        ))}
                        {uploadPreviewData.length > 100 && (
                          <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>...and {uploadPreviewData.length - 100} more</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {uploadStatus && (
                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, background: uploadStatus.type === 'success' ? '#ecfdf5' : '#fff1f2', color: uploadStatus.type === 'success' ? '#047857' : '#be123c' }}>
                      {uploadStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                      {uploadStatus.msg}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            {!isProcessingUpload && (
              <div style={{ padding: '20px 28px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button
                  onClick={uploadType === 'ROSTER' ? confirmRosterUpload : confirmSingleUpload}
                  style={{
                    width: '100%',
                    minHeight: '54px',
                    padding: '0 16px',
                    color: 'white',
                    borderRadius: '16px',
                    fontWeight: 900,
                    fontSize: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: uploadType === 'ROSTER' ? '#4f46e5' : '#10b981',
                    boxShadow: uploadType === 'ROSTER' ? '0 8px 24px rgba(79,70,229,0.3)' : '0 8px 24px rgba(16,185,129,0.3)',
                    transition: 'transform 0.15s, filter 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.filter = 'brightness(1.1)'; (e.target as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.filter = ''; (e.target as HTMLElement).style.transform = ''; }}
                >
                  <CheckCircle2 size={20} />
                  {uploadType === 'ROSTER' ? 'Confirm & Sync Roster' : 'Confirm & Sync Grades'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeEntry;
