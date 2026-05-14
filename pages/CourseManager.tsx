import React, { useState, useMemo } from 'react';
import { Course, User, UserRole, GradeConfig } from '../types';
import { 
    Plus, Settings, Edit2, Trash2, XCircle, AlertTriangle, 
    Lock, BookOpen, Users, CheckCircle2, 
    Target, Zap, GraduationCap, Eye, EyeOff, LayoutGrid, Search, 
    UserPlus, Check, X, ChevronRight, Info, ChevronUp, ChevronDown,
    Save, Hash, PenTool
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

const DEFAULT_CONFIG: GradeConfig = {
    totalTargetScore: 25,
    quizCount: 5,
    quizMaxScore: 5,
    quizIndividualMaxScores: [5, 5, 5, 5, 5],
    quizBestOf: 3,
    assignmentCount: 4,
    assignmentMaxScore: 5,
    assignmentIndividualMaxScores: [5, 5, 5, 5],
    assignmentBestOf: 2,
    enableBonus: true
};

const InputField = ({ label, value, onChange, placeholder, required, disabled, type = "text", icon: Icon, className, mono = false }: any) => (
    <div className={`space-y-2 ${className}`}>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
            {Icon && <Icon size={16} className="text-indigo-400" />} {label}
        </label>
        <div className="relative group">
            <input 
                type={type}
                required={required}
                disabled={disabled}
                value={value}
                onChange={onChange}
                className={`w-full h-14 px-5 bg-white/60 backdrop-blur-sm border-2 border-slate-100/80 rounded-[24px] text-base font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300
                    focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 hover:border-slate-200 disabled:bg-slate-50/50 disabled:text-slate-400 ${mono ? 'font-mono uppercase tracking-wider' : ''}`}
                placeholder={placeholder}
            />
        </div>
    </div>
);

const NumberInput = ({ label, value, onChange, min, max, disabled }: any) => (
     <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1 truncate block">{label}</label>
        <input 
            type="number" 
            min={min}
            max={max}
            disabled={disabled}
            value={value} 
            onChange={onChange} 
            className="w-full h-12 px-4 bg-white/60 backdrop-blur-sm border-2 border-slate-100/80 rounded-[20px] font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-center transition-all disabled:bg-slate-50/50" 
        />
    </div>
);

const SelectedStaffView = ({ title, type, selectedIds, onAssign, disabled, icon: Icon, colorClass, users, onRemove }: any) => {
    const displayList = users.filter((u: User) => selectedIds.includes(u.id));
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Icon size={20} className={colorClass} strokeWidth={2.5} />
                    {title}
                </label>
                {!disabled && (
                    <button 
                        type="button"
                        onClick={onAssign}
                        className={`text-[10px] font-black uppercase px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 active:scale-95`}
                    >
                        <UserPlus size={16} strokeWidth={2.5}/> Assign
                    </button>
                )}
            </div>
            <div className={`p-5 rounded-[28px] border-2 border-dashed min-h-[120px] flex flex-wrap gap-3 items-start transition-all duration-300 ${disabled ? 'bg-slate-50/50 border-slate-200' : 'bg-white/40 backdrop-blur-sm border-indigo-100/80 hover:border-indigo-300 hover:bg-white/60'}`}>
                {displayList.map((u: User) => (
                    <div key={u.id} className="flex items-center gap-3 bg-white text-slate-800 pl-5 pr-2 py-2 rounded-2xl border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] animate-scale-up group">
                        <span className="text-sm font-black">{u.name}</span>
                        {!disabled && (
                            <button 
                                type="button" 
                                onClick={() => onRemove(u.id, type)}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                ))}
                {displayList.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center py-6 opacity-60">
                        <div className="w-12 h-12 bg-slate-100/80 rounded-full flex items-center justify-center mb-3">
                            <Users size={20} className="text-slate-400" strokeWidth={2.5} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">No staff assigned</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface CourseManagerProps {
    user?: User;
}

const CourseManager: React.FC<CourseManagerProps> = ({ user }) => {
    const { activeBatch, courses: allCourses, users, addCourse, updateCourse, removeCourse } = useData();
    
    const isAssistant = user?.role === UserRole.ASSISTANT;
    const isSupervisor = user?.role === UserRole.SUPERVISOR;
    
    const courses = (isAssistant && user) 
        ? allCourses.filter(c => c.assistantIds?.includes(user.id))
        : allCourses;

    const canEditMetadata = true; 
    const canEditConfig = true; 

    const assistants = users.filter(u => u.role === UserRole.ASSISTANT);
    const professors = users.filter(u => u.role === UserRole.PROFESSOR);

    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);
    const [selectedAsstIds, setSelectedAsstIds] = useState<string[]>([]);
    const [config, setConfig] = useState<GradeConfig>(DEFAULT_CONFIG);
    const [isPublished, setIsPublished] = useState(false);
    
    const [showAdvancedQuizzes, setShowAdvancedQuizzes] = useState(false);
    const [showAdvancedAssigns, setShowAdvancedAssigns] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const [pickerConfig, setPickerConfig] = useState<{ isOpen: boolean; type: 'PROF' | 'ASST'; searchQuery: string } | null>(null);

    const updateQuizCount = (count: number) => {
        const num = Math.max(1, isNaN(count) ? 1 : count);
        const newMaxScores = Array(num).fill(0).map((_, i) => config.quizIndividualMaxScores[i] || config.quizMaxScore);
        setConfig({ 
            ...config, 
            quizCount: num, 
            quizIndividualMaxScores: newMaxScores,
            quizBestOf: Math.min(config.quizBestOf, num)
        });
    };

    const updateAssignmentCount = (count: number) => {
        const num = Math.max(1, isNaN(count) ? 1 : count);
        const newMaxScores = Array(num).fill(0).map((_, i) => config.assignmentIndividualMaxScores[i] || config.assignmentMaxScore);
        setConfig({ 
            ...config, 
            assignmentCount: num, 
            assignmentIndividualMaxScores: newMaxScores,
            assignmentBestOf: Math.min(config.assignmentBestOf, num)
        });
    };

    const handleIndividualQuizMax = (index: number, val: number) => {
        const newScores = [...config.quizIndividualMaxScores];
        newScores[index] = val;
        setConfig({ ...config, quizIndividualMaxScores: newScores });
    };

    const handleIndividualAssignMax = (index: number, val: number) => {
        const newScores = [...config.assignmentIndividualMaxScores];
        newScores[index] = val;
        setConfig({ ...config, assignmentIndividualMaxScores: newScores });
    };

    const handleEditStart = (course: Course) => {
        setEditingCourseId(course.id);
        setName(course.name);
        setCode(course.code);
        setSelectedProfIds(course.professorIds || []);
        setSelectedAsstIds(course.assistantIds || []);
        setConfig(course.config);
        setIsPublished(course.isPublished || false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleStaffSelection = (id: string, type: 'PROF' | 'ASST') => {
        if (type === 'PROF') {
            setSelectedProfIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedAsstIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    const executeDelete = async () => {
        if (confirmDeleteId && activeBatch) {
            await removeCourse(confirmDeleteId, activeBatch.id);
            setConfirmDeleteId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!activeBatch) return;

        let finalAsstIds = [...selectedAsstIds];
        if (editingCourseId === 'new' && isAssistant && user && !finalAsstIds.includes(user.id)) {
            finalAsstIds.push(user.id);
        }

        const newCourse: Course = {
            id: editingCourseId === 'new' ? `new_${Date.now()}` : editingCourseId!,
            name,
            code: code.toUpperCase(),
            batchId: activeBatch.id,
            professorIds: selectedProfIds,
            assistantIds: finalAsstIds,
            config: config,
            isPublished: isPublished
        };

        if (editingCourseId && editingCourseId !== 'new') {
            await updateCourse(newCourse);
        } else {
            await addCourse(newCourse);
        }
        resetForm();
    };

    const resetForm = () => {
        setEditingCourseId(null);
        setName('');
        setCode('');
        setSelectedProfIds([]);
        setSelectedAsstIds([]);
        setConfig(DEFAULT_CONFIG);
        setIsPublished(false);
        setShowAdvancedQuizzes(false);
        setShowAdvancedAssigns(false);
    };

    const filteredPickerList = useMemo(() => {
        if (!pickerConfig) return [];
        const baseList = pickerConfig.type === 'PROF' ? professors : assistants;
        if (!pickerConfig.searchQuery) return baseList;
        return baseList.filter(u => 
            u.name.toLowerCase().includes(pickerConfig.searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(pickerConfig.searchQuery.toLowerCase())
        );
    }, [pickerConfig, professors, assistants]);

    if(!activeBatch) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 animate-fade-in relative z-10">
            <div className="w-32 h-32 bg-amber-50 rounded-[40px] flex items-center justify-center text-amber-500 shadow-inner shadow-amber-100/50 border border-amber-100/50">
                <AlertTriangle size={64} strokeWidth={2} />
            </div>
            <div className="text-center max-w-md mx-auto bg-white/60 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Academic Year Required</h3>
                <p className="text-slate-500 mt-3 font-medium leading-relaxed">Please activate a semester in <span className="text-slate-900 font-black">Academic Years</span> to manage courses.</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in-up relative pb-20 max-w-7xl mx-auto z-10">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-indigo-50/40 to-transparent -z-10 rounded-[40px] pointer-events-none"></div>

            {/* Staff Picker Modal */}
            {pickerConfig?.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setPickerConfig(null)}></div>
                    <div className="bg-white/90 backdrop-blur-3xl rounded-[40px] w-full max-w-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden flex flex-col animate-scale-up border border-white/50 max-h-[85vh]">
                        
                        {/* Modal Header */}
                        <div className="p-8 pb-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {pickerConfig.type === 'PROF' ? 'Select Professors' : 'Select Assistants'}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">Multi-selection enabled</p>
                            </div>
                            <button onClick={() => setPickerConfig(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm rounded-[20px] transition-all active:scale-95 border border-transparent hover:border-rose-100"><X size={24} strokeWidth={2.5}/></button>
                        </div>
                        
                        {/* Search Bar & List Container */}
                        <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                            <div className="relative shrink-0 group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} strokeWidth={2.5} />
                                <input 
                                    autoFocus
                                    placeholder="Search by name or username..."
                                    className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200/80 rounded-[28px] shadow-[0_8px_20px_rgba(0,0,0,0.03)] font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-lg text-slate-800 placeholder-slate-300"
                                    value={pickerConfig.searchQuery}
                                    onChange={e => setPickerConfig({...pickerConfig, searchQuery: e.target.value})}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {filteredPickerList.map(u => {
                                    const isSelected = pickerConfig.type === 'PROF' ? selectedProfIds.includes(u.id) : selectedAsstIds.includes(u.id);
                                    return (
                                        <div 
                                            key={u.id}
                                            onClick={() => toggleStaffSelection(u.id, pickerConfig.type)}
                                            className={`p-5 rounded-[28px] flex items-center justify-between cursor-pointer transition-all border-2 ${isSelected ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-transparent text-white shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:-translate-y-0.5' : 'bg-white border-white hover:border-indigo-200 text-slate-700 shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:shadow-md'}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center font-black text-xl shadow-inner ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-lg tracking-tight">{u.name}</p>
                                                    <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>@{u.username}</p>
                                                </div>
                                            </div>
                                            {isSelected && <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-indigo-600 shadow-md animate-scale-up"><Check size={18} strokeWidth={3} /></div>}
                                        </div>
                                    );
                                })}
                                {filteredPickerList.length === 0 && (
                                    <div className="py-20 text-center space-y-5 animate-fade-in">
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-slate-100"><Users size={40} className="text-slate-300" strokeWidth={2} /></div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">No matches found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-white border-t border-slate-100/50 shrink-0">
                             <button onClick={() => setPickerConfig(null)} className="w-full py-5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-black text-xl rounded-[28px] hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-[0_12px_24px_rgba(79,70,229,0.25)] active:scale-95 hover:-translate-y-1 tracking-tight">Confirm Selection</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-hidden">
                    <div className="bg-white/95 backdrop-blur-3xl rounded-[40px] p-12 w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-scale-up text-center border border-white/50">
                        <div className="w-28 h-28 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-rose-200/50">
                            <Trash2 size={48} strokeWidth={2} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Confirm Destruction</h3>
                        <p className="text-slate-500 font-bold text-base mb-12 leading-relaxed px-4">Deleting this course will wipe out all registered student grades and configurations. <br/><span className="text-rose-600 font-black mt-2 inline-block">This is irreversible.</span></p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-5 bg-slate-100/80 text-slate-600 rounded-[28px] font-black text-lg hover:bg-slate-200 transition-all hover:scale-105 active:scale-95">Cancel</button>
                            <button onClick={executeDelete} className="flex-1 py-5 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-[28px] font-black text-lg shadow-[0_12px_24px_rgba(225,29,72,0.3)] hover:-translate-y-1 transition-all active:scale-95">Destroy</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-[24px]">
                        <LayoutGrid size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Course Architecture</h1>
                        <p className="text-slate-500 font-bold mt-1 text-sm">Design academic grading schemes and assign specialist teams.</p>
                    </div>
                </div>
                {!editingCourseId && (
                    <button 
                        onClick={() => { setEditingCourseId('new'); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-8 min-h-[52px] rounded-[24px] font-black shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:from-indigo-500 hover:to-indigo-600 hover:-translate-y-1 transition-all active:scale-95"
                    >
                        <Plus size={22} strokeWidth={2.5} /> New Course
                    </button>
                )}
            </div>
            
            {editingCourseId && (
                <div className="p-10 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white/80 backdrop-blur-2xl border border-white/80 animate-fade-in-up relative overflow-hidden">
                    
                    <div className="flex justify-between items-center mb-10 relative z-10 pb-8 border-b border-slate-100/50">
                        <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-[24px] shadow-sm ${editingCourseId === 'new' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : 'bg-gradient-to-br from-amber-400 to-amber-500'} text-white`}>
                                {editingCourseId === 'new' ? <Plus size={32} strokeWidth={2.5} /> : <Settings size={32} strokeWidth={2.5} />}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {editingCourseId === 'new' ? 'Initialize New Course' : 'Refine Architecture'}
                                </h2>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1.5">
                                    {editingCourseId === 'new' ? 'Set basic parameters and grading rules' : `Modifying parameters for ${code}`}
                                </p>
                            </div>
                        </div>
                        <button onClick={resetForm} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[20px] shadow-sm transition-all active:scale-95">
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
                            {/* Left Column: Identity & Status */}
                            <div className="space-y-10">
                                <div className="p-8 bg-white/50 border border-slate-100/80 rounded-[32px] shadow-sm">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5 mb-6 text-indigo-900">
                                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><BookOpen size={16} strokeWidth={2.5} /></div> Basic Identity
                                    </h3>
                                    <div className="space-y-6">
                                        <InputField 
                                            label="Official Course Title" 
                                            value={name} 
                                            onChange={(e: any) => setName(e.target.value)} 
                                            placeholder="e.g. Advanced Structural Design" 
                                            disabled={!canEditMetadata}
                                            required
                                        />
                                        <InputField 
                                            label="Universal Code" 
                                            value={code} 
                                            onChange={(e: any) => setCode(e.target.value)} 
                                            placeholder="e.g. CVE301" 
                                            disabled={!canEditMetadata}
                                            required
                                            mono
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-white/50 border border-slate-100/80 rounded-[32px] shadow-sm">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5 mb-6 text-indigo-900">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Zap size={16} strokeWidth={2.5} /></div> Operational Status
                                    </h3>
                                    <label className={`flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all shadow-sm ${isPublished ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-[16px] transition-colors shadow-inner ${isPublished ? 'bg-white text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                                {isPublished ? <Eye size={24} strokeWidth={2.5} /> : <EyeOff size={24} strokeWidth={2.5} />}
                                            </div>
                                            <div>
                                                <p className={`font-black text-base ${isPublished ? 'text-emerald-800' : 'text-slate-700'}`}>
                                                    {isPublished ? 'Publicly Visible' : 'Internal Draft'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                    {isPublished ? 'Students can view results' : 'Hidden from student portal'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input type="checkbox" className="hidden" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
                                            <div className={`w-14 h-8 rounded-full transition-colors duration-300 shadow-inner ${isPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${isPublished ? 'left-7' : 'left-1'}`}></div>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Right Column: Staff Assignment */}
                            <div className="p-8 bg-white/50 border border-slate-100/80 rounded-[32px] shadow-sm">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2.5 mb-6 text-indigo-900">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Users size={16} strokeWidth={2.5} /></div> Staff Assignment
                                </h3>
                                <div className="space-y-8">
                                    <SelectedStaffView 
                                        title="Academic Professors" 
                                        type="PROF" 
                                        selectedIds={selectedProfIds} 
                                        onAssign={() => setPickerConfig({ isOpen: true, type: 'PROF', searchQuery: '' })}
                                        icon={GraduationCap} 
                                        colorClass="text-indigo-500"
                                        disabled={!canEditMetadata}
                                        users={users}
                                        onRemove={toggleStaffSelection}
                                    />
                                    <div className="w-full h-px bg-slate-100/80"></div>
                                    <SelectedStaffView 
                                        title="Teaching Assistants" 
                                        type="ASST" 
                                        selectedIds={selectedAsstIds} 
                                        onAssign={() => setPickerConfig({ isOpen: true, type: 'ASST', searchQuery: '' })}
                                        icon={Users} 
                                        colorClass="text-emerald-500"
                                        disabled={!canEditMetadata}
                                        users={users}
                                        onRemove={toggleStaffSelection}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grading Architecture Section */}
                        <div className="pt-10 border-t border-slate-100/80">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-[20px] shadow-inner"><Settings size={28} strokeWidth={2.5}/></div>
                                    <div>
                                        <h3 className="font-black text-2xl tracking-tight text-slate-900">Grading Architecture</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure weights and limits</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100/50 shadow-sm">
                                    <Info size={16} strokeWidth={2.5} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Supports "Best N of M" Logic</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                {/* Total Score Card */}
                                <div className="lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-[36px] shadow-2xl flex flex-col justify-between relative overflow-hidden border border-slate-700">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.07] transform translate-x-4 -translate-y-4"><Target size={120} strokeWidth={2} /></div>
                                    <div className="relative z-10">
                                        <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-5 flex items-center gap-2">
                                            <Target size={14}/> Course Total
                                        </h4>
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <input 
                                                disabled={!canEditConfig} 
                                                type="number" 
                                                value={config.totalTargetScore} 
                                                onChange={e => setConfig({...config, totalTargetScore: parseInt(e.target.value) || 0})} 
                                                className="bg-white/10 backdrop-blur-md w-full py-6 px-4 rounded-[28px] text-5xl font-black outline-none border border-white/20 focus:border-indigo-400 focus:bg-white/15 text-center transition-all shadow-inner" 
                                            />
                                        </div>
                                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Max Possible Points</p>
                                    </div>
                                    
                                    <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="font-black text-[10px] text-white uppercase tracking-widest flex items-center gap-2">
                                                <Zap size={16} className={config.enableBonus ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'} strokeWidth={2.5} /> Bonus Pts
                                            </span>
                                            <input disabled={!canEditConfig} type="checkbox" className="hidden" checked={config.enableBonus} onChange={e => setConfig({...config, enableBonus: e.target.checked})} />
                                            <div className={`w-12 h-7 rounded-full transition-all relative shadow-inner ${config.enableBonus ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${config.enableBonus ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Quiz Logic Card */}
                                <div className="lg:col-span-2 p-8 bg-gradient-to-br from-indigo-50/50 to-white rounded-[36px] border border-indigo-100/50 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="font-black uppercase tracking-widest text-[11px] text-indigo-600 flex items-center gap-2.5">
                                            <div className="p-1.5 bg-indigo-100 rounded-lg"><PenTool size={16} strokeWidth={2.5}/></div> Quiz Logic
                                        </h4>
                                        <div className="bg-white border border-indigo-100/50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black shadow-sm tracking-wider">
                                            {config.quizMaxScore} pts / quiz
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-5 mb-5">
                                        <NumberInput label="Total Quizzes (M)" value={config.quizCount} onChange={(e: any) => updateQuizCount(parseInt(e.target.value))} min={1} disabled={!canEditConfig} />
                                        <NumberInput label="Count Best (N)" value={config.quizBestOf} onChange={(e: any) => setConfig({...config, quizBestOf: Math.min(parseInt(e.target.value) || 1, config.quizCount)})} min={1} max={config.quizCount} disabled={!canEditConfig} />
                                    </div>
                                    <NumberInput label="Default Weight per Quiz" value={config.quizMaxScore} onChange={(e: any) => setConfig({...config, quizMaxScore: parseInt(e.target.value) || 0})} disabled={!canEditConfig} />
                                    
                                    <div className="mt-auto pt-6">
                                        <button type="button" onClick={() => setShowAdvancedQuizzes(!showAdvancedQuizzes)} className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black text-indigo-500 uppercase bg-white border border-indigo-100 rounded-[20px] hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-sm">
                                            {showAdvancedQuizzes ? <ChevronUp size={16} strokeWidth={2.5}/> : <ChevronDown size={16} strokeWidth={2.5}/>} Advanced Individual Weights
                                        </button>
                                        {showAdvancedQuizzes && (
                                            <div className="mt-4 grid grid-cols-3 xl:grid-cols-5 gap-3 bg-white p-4 rounded-[24px] border border-indigo-50 animate-fade-in shadow-inner">
                                                {Array.from({length: config.quizCount}).map((_, idx) => (
                                                    <div key={idx}>
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center mb-1.5">Q{idx+1}</label>
                                                        <input type="number" value={config.quizIndividualMaxScores[idx] || config.quizMaxScore} onChange={e => handleIndividualQuizMax(idx, parseInt(e.target.value) || 0)} className="w-full p-2 bg-indigo-50/50 rounded-[12px] text-sm font-black text-indigo-900 text-center outline-none focus:ring-2 focus:ring-indigo-200 border border-transparent focus:border-indigo-300 transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Assignment Logic Card */}
                                <div className="lg:col-span-2 p-8 bg-gradient-to-br from-emerald-50/50 to-white rounded-[36px] border border-emerald-100/50 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="font-black uppercase tracking-widest text-[11px] text-emerald-600 flex items-center gap-2.5">
                                            <div className="p-1.5 bg-emerald-100 rounded-lg"><Hash size={16} strokeWidth={2.5}/></div> Assignment Logic
                                        </h4>
                                        <div className="bg-white border border-emerald-100/50 text-emerald-700 px-4 py-1.5 rounded-xl text-[10px] font-black shadow-sm tracking-wider">
                                            {config.assignmentMaxScore} pts / task
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5 mb-5">
                                        <NumberInput label="Total Tasks (M)" value={config.assignmentCount} onChange={(e: any) => updateAssignmentCount(parseInt(e.target.value))} min={1} disabled={!canEditConfig} />
                                        <NumberInput label="Count Best (N)" value={config.assignmentBestOf} onChange={(e: any) => setConfig({...config, assignmentBestOf: Math.min(parseInt(e.target.value) || 1, config.assignmentCount)})} min={1} max={config.assignmentCount} disabled={!canEditConfig} />
                                    </div>
                                    <NumberInput label="Default Weight per Task" value={config.assignmentMaxScore} onChange={(e: any) => setConfig({...config, assignmentMaxScore: parseInt(e.target.value) || 0})} disabled={!canEditConfig} />

                                    <div className="mt-auto pt-6">
                                        <button type="button" onClick={() => setShowAdvancedAssigns(!showAdvancedAssigns)} className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 uppercase bg-white border border-emerald-100 rounded-[20px] hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-sm">
                                            {showAdvancedAssigns ? <ChevronUp size={16} strokeWidth={2.5}/> : <ChevronDown size={16} strokeWidth={2.5}/>} Advanced Individual Weights
                                        </button>
                                        {showAdvancedAssigns && (
                                            <div className="mt-4 grid grid-cols-3 xl:grid-cols-5 gap-3 bg-white p-4 rounded-[24px] border border-emerald-50 animate-fade-in shadow-inner">
                                                {Array.from({length: config.assignmentCount}).map((_, idx) => (
                                                    <div key={idx}>
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block text-center mb-1.5">A{idx+1}</label>
                                                        <input type="number" value={config.assignmentIndividualMaxScores[idx] || config.assignmentMaxScore} onChange={e => handleIndividualAssignMax(idx, parseInt(e.target.value) || 0)} className="w-full p-2 bg-emerald-50/50 rounded-[12px] text-sm font-black text-emerald-900 text-center outline-none focus:ring-2 focus:ring-emerald-200 border border-transparent focus:border-emerald-300 transition-all" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-5 pt-10 border-t border-slate-100/80">
                            <button onClick={resetForm} type="button" className="px-8 ui-btn-soft">Cancel</button>
                            <button type="submit" className={`flex-1 min-h-[52px] rounded-[24px] font-black text-lg shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 ${editingCourseId === 'new' ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-300/50' : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-300/50'} text-white`}>
                                <Save size={24} strokeWidth={2.5} />
                                {editingCourseId === 'new' ? 'Initialize Course' : 'Commit Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.length === 0 && !editingCourseId && (
                    <div className="col-span-full py-32 bg-white/50 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-200/80 text-center flex flex-col items-center">
                        <div className="p-8 bg-white rounded-[32px] text-slate-300 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"><BookOpen size={56} strokeWidth={1.5} /></div>
                        <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No Active Courses Found</p>
                        <p className="text-slate-400 font-bold mt-2">Start by creating your first academic module</p>
                        <button onClick={() => setEditingCourseId('new')} className="mt-8 inline-flex items-center gap-3 bg-white border border-indigo-100 text-indigo-600 font-black px-8 min-h-[52px] rounded-[24px] hover:bg-indigo-50 hover:border-indigo-200 hover:-translate-y-1 transition-all shadow-sm active:scale-95">
                            <Plus size={20} strokeWidth={2.5}/> Initialize First Course
                        </button>
                    </div>
                )}
                
                {courses.map(c => (
                    <div key={c.id} className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 group hover:border-indigo-200 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:scale-150 transition-transform duration-500 opacity-60"></div>
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="flex flex-col gap-2">
                                <span className="px-4 py-1.5 bg-slate-100/80 backdrop-blur-sm text-slate-600 text-[10px] font-black uppercase rounded-xl w-fit tracking-widest border border-slate-200/50 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shadow-sm">
                                    {c.code}
                                </span>
                                <h3 className="font-black text-2xl text-slate-900 tracking-tight mt-2 line-clamp-2">{c.name}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleEditStart(c)} className="p-3 bg-white text-slate-400 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200 rounded-2xl transition-all border border-slate-100 shadow-sm"><Edit2 size={18} strokeWidth={2.5} /></button>
                                {!isAssistant && !isSupervisor && (
                                    <button type="button" onClick={() => setConfirmDeleteId(c.id)} className="p-3 bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 rounded-2xl transition-all border border-slate-100 shadow-sm"><Trash2 size={18} strokeWidth={2.5} /></button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10 flex-1 flex flex-col">
                            {/* Staff Chips */}
                            <div className="flex flex-wrap gap-2 min-h-[28px]">
                                {c.professorIds?.slice(0, 3).map(id => {
                                    const prof = users.find(u => u.id === id);
                                    return prof ? <span key={id} className="px-2.5 py-1 bg-indigo-50/80 text-indigo-700 border border-indigo-100/50 rounded-lg text-[9px] font-black uppercase tracking-wider truncate max-w-[120px] shadow-sm">{prof.name.split(' ')[0]}</span> : null;
                                })}
                                {c.assistantIds?.slice(0, 3).map(id => {
                                    const asst = users.find(u => u.id === id);
                                    return asst ? <span key={id} className="px-2.5 py-1 bg-emerald-50/80 text-emerald-700 border border-emerald-100/50 rounded-lg text-[9px] font-black uppercase tracking-wider truncate max-w-[120px] shadow-sm">{asst.name.split(' ')[0]}</span> : null;
                                })}
                                {(c.professorIds?.length || 0) + (c.assistantIds?.length || 0) > 6 && (
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">...</span>
                                )}
                            </div>

                             <div className="grid grid-cols-2 gap-5 pt-6 border-t border-slate-100/80 mt-auto">
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Structure</span>
                                     <div className="flex items-center gap-1.5 text-sm font-black text-slate-700 bg-slate-50/80 px-3 py-2 rounded-xl w-fit border border-slate-100/50">
                                         <span className="text-indigo-600">{c.config.quizCount}Q</span> <span className="text-slate-300">•</span> <span className="text-emerald-600">{c.config.assignmentCount}A</span>
                                     </div>
                                 </div>
                                 <div className="flex flex-col items-end text-right">
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Limit</span>
                                     <span className="text-2xl font-black text-slate-800 tracking-tight">{c.config.totalTargetScore} <span className="text-[10px] text-slate-400">Pts</span></span>
                                 </div>
                             </div>

                             <div className="flex items-center justify-between pt-5 mt-2 border-t border-slate-100/50">
                                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm ${c.isPublished ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                     <div className={`w-2 h-2 rounded-full ${c.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                     <span className="text-[9px] font-black uppercase tracking-widest">
                                         {c.isPublished ? 'Published' : 'Draft'}
                                     </span>
                                 </div>
                                 {c.config.enableBonus && (
                                     <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm uppercase tracking-wider">
                                         <Zap size={12} strokeWidth={3} className="text-amber-500" /> Bonus Active
                                     </span>
                                 )}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseManager;
