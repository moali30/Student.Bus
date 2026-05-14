
import React, { useState, useEffect, useMemo } from 'react';
import { StudentResult, User, UserRole } from '../types';
import { calculateStudentGrade } from '../services/storage';
import { useData } from '../contexts/DataContext';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
    Target, Award, RefreshCw, Calculator, Users,
    CheckCircle2, TrendingUp, TrendingDown, Medal, AlertOctagon, Printer,
    Sigma
} from 'lucide-react';

interface CourseStatsProps {
    user: User;
}

const CourseStats: React.FC<CourseStatsProps> = ({ user }) => {
    const { activeBatch, courses, getCourseResults } = useData();
    
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [rawResults, setRawResults] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter courses based on role
    const availableCourses = useMemo(() => {
        if (!activeBatch) return [];
        let filtered = courses.filter(c => c.batchId === activeBatch.id);
        
        if (user.role === UserRole.PROFESSOR) {
            filtered = filtered.filter(c => c.professorIds?.includes(user.id));
        } else if (user.role === UserRole.ASSISTANT) {
            filtered = filtered.filter(c => c.assistantIds?.includes(user.id));
        }
        
        return filtered;
    }, [activeBatch, courses, user]);

    const selectedCourse = useMemo(() => 
        availableCourses.find(c => String(c.id) === String(selectedCourseId)), 
    [availableCourses, selectedCourseId]);

    // Fetch data on course selection
    useEffect(() => {
        if (selectedCourseId) {
            setIsLoading(true);
            getCourseResults(selectedCourseId)
                .then((data) => {
                    setRawResults(data || []);
                })
                .catch(err => {
                    console.error("Stats Fetch Error:", err);
                    setRawResults([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setRawResults([]);
        }
    }, [selectedCourseId, getCourseResults]);

    // Comprehensive Stats Calculation
    const stats = useMemo(() => {
        if (!selectedCourse || rawResults.length === 0) return null;
        
        const config = selectedCourse.config;
        
        // 1. Pre-process results with safe calculation
        const processedStudents = rawResults.map(s => {
            const calculatedTotal = calculateStudentGrade(
                s.quizScores || [], 
                s.assignmentScores || [], 
                s.bonusScore || 0, 
                config
            );
            return { ...s, calculatedTotal };
        });

        const totalStudents = processedStudents.length;
        if (totalStudents === 0) return null;

        const scores = processedStudents.map(s => s.calculatedTotal);
        
        // 2. Basic Metrics
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / totalStudents;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        
        // 3. Standard Deviation
        const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / totalStudents;
        const stdDev = Math.sqrt(variance);

        // 4. Pass/Fail
        const passingScore = config.totalTargetScore * 0.5;
        const passedCount = scores.filter(s => s >= passingScore).length;
        const passRate = (passedCount / totalStudents) * 100;

        // 5. Distribution Buckets
        const distribution = [
            { name: '0-20%', range: '<20%', count: 0, fill: '#ef4444' }, // Red
            { name: '21-40%', range: '20-40%', count: 0, fill: '#f97316' }, // Orange
            { name: '41-60%', range: '40-60%', count: 0, fill: '#eab308' }, // Yellow
            { name: '61-80%', range: '60-80%', count: 0, fill: '#3b82f6' }, // Blue
            { name: '81-100%', range: '>80%', count: 0, fill: '#10b981' }, // Green
        ];

        scores.forEach(s => {
            const pct = (s / config.totalTargetScore) * 100;
            if (pct <= 20) distribution[0].count++;
            else if (pct <= 40) distribution[1].count++;
            else if (pct <= 60) distribution[2].count++;
            else if (pct <= 80) distribution[3].count++;
            else distribution[4].count++;
        });

        // 6. Assessment Performance (Quizzes)
        const quizPerf = Array.from({length: config.quizCount}).map((_, i) => {
            const maxScore = (config.quizIndividualMaxScores && config.quizIndividualMaxScores[i] > 0) 
                ? config.quizIndividualMaxScores[i] 
                : config.quizMaxScore;
            
            // Collect valid scores for this quiz
            const validScores = processedStudents
                .map(s => s.quizScores[i])
                .filter(val => val !== null && val !== undefined && (val as any) !== '')
                .map(Number);
            
            const qAvg = validScores.length ? validScores.reduce((a,b) => a+b, 0) / validScores.length : 0;
            const percentage = maxScore > 0 ? (qAvg / maxScore) * 100 : 0;
            
            return {
                name: `Q${i+1}`,
                avg: parseFloat(qAvg.toFixed(1)),
                max: maxScore,
                percentage: parseFloat(percentage.toFixed(1))
            };
        });

        // 7. Assessment Performance (Assignments)
        const assignPerf = Array.from({length: config.assignmentCount}).map((_, i) => {
            const maxScore = (config.assignmentIndividualMaxScores && config.assignmentIndividualMaxScores[i] > 0) 
                ? config.assignmentIndividualMaxScores[i] 
                : config.assignmentMaxScore;
            
            const validScores = processedStudents
                .map(s => s.assignmentScores[i])
                .filter(val => val !== null && val !== undefined && (val as any) !== '')
                .map(Number);
            
            const aAvg = validScores.length ? validScores.reduce((a,b) => a+b, 0) / validScores.length : 0;
            const percentage = maxScore > 0 ? (aAvg / maxScore) * 100 : 0;
            
            return {
                name: `A${i+1}`,
                avg: parseFloat(aAvg.toFixed(1)),
                max: maxScore,
                percentage: parseFloat(percentage.toFixed(1))
            };
        });

        // 8. Top Students
        const topStudents = [...processedStudents]
            .sort((a, b) => b.calculatedTotal - a.calculatedTotal)
            .slice(0, 5);

        // 9. At Risk Students (Bottom 5)
        const atRiskStudents = [...processedStudents]
            .filter(s => s.calculatedTotal < passingScore)
            .sort((a, b) => a.calculatedTotal - b.calculatedTotal)
            .slice(0, 5);

        return { 
            totalStudents, 
            avg: parseFloat(avg.toFixed(1)), 
            max, 
            min,
            stdDev: parseFloat(stdDev.toFixed(1)),
            passRate: parseFloat(passRate.toFixed(1)), 
            passedCount,
            failedCount: totalStudents - passedCount,
            distribution,
            quizPerf,
            assignPerf,
            topStudents,
            atRiskStudents
        };
    }, [selectedCourse, rawResults]);

    // -- Sub-components for cleaner render --

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass }: any) => (
        <div className={`bg-white p-6 rounded-[24px] border ${borderClass} shadow-sm flex items-center justify-between`}>
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800">{value}</h3>
                {subtext && <p className="text-xs font-bold text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-4 rounded-2xl ${colorClass}`}><Icon size={24} /></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in-up pb-12 print:space-y-4">
            {/* Header / Filter */}
            <div className="bg-slate-900 p-8 rounded-[32px] shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-6 print:bg-white print:text-black print:border print:border-black print:shadow-none print:p-0 print:rounded-none print:mb-8">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3"><Calculator className="text-indigo-400 print:hidden" /> Course Analytics</h1>
                    <p className="text-slate-400 font-medium mt-1 print:text-slate-600">{activeBatch?.name || 'Academic Term'}</p>
                </div>
                <div className="relative w-full md:w-80 print:hidden">
                    <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white font-bold rounded-2xl px-6 py-4 outline-none transition-all cursor-pointer appearance-none hover:border-slate-500">
                        <option value="">Select Course...</option>
                        {availableCourses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                    </select>
                </div>
                {/* Print Title Only */}
                {selectedCourse && (
                    <div className="hidden print:block text-right">
                        <h2 className="text-xl font-bold">{selectedCourse.name}</h2>
                        <p className="text-sm">{selectedCourse.code}</p>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="p-20 text-center flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-indigo-500" size={32} />
                    <p className="text-slate-400 font-bold">Crunching numbers...</p>
                </div>
            ) : !stats ? (
                <div className="p-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px]">
                    <Calculator size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">Select a course to view detailed analytics</p>
                </div>
            ) : (
                <div className="space-y-8 print:space-y-6">
                    {/* Row 1: KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard 
                            title="Average" 
                            value={stats.avg} 
                            subtext={`Max: ${stats.max}`} 
                            icon={Target} 
                            colorClass="bg-indigo-50 text-indigo-600" 
                            borderClass="border-indigo-100"
                        />
                         <StatCard 
                            title="Pass Rate" 
                            value={`${stats.passRate}%`} 
                            subtext={`${stats.passedCount} Passed`}
                            icon={CheckCircle2} 
                            colorClass={stats.passRate >= 70 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"} 
                            borderClass={stats.passRate >= 70 ? "border-emerald-100" : "border-amber-100"}
                        />
                         <StatCard 
                            title="Std. Deviation" 
                            value={stats.stdDev} 
                            icon={Sigma} 
                            colorClass="bg-blue-50 text-blue-600" 
                            borderClass="border-blue-100"
                        />
                         <StatCard 
                            title="Lowest Score" 
                            value={stats.min} 
                            icon={TrendingDown} 
                            colorClass="bg-rose-50 text-rose-600" 
                            borderClass="border-rose-100"
                        />
                         <StatCard 
                            title="Total Students" 
                            value={stats.totalStudents} 
                            icon={Users} 
                            colorClass="bg-slate-50 text-slate-600" 
                            borderClass="border-slate-100"
                        />
                    </div>

                    {/* Row 2: Charts (Distribution & Pass/Fail) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Distribution Chart */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm print:border-black">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <TrendingUp size={18} className="text-slate-400"/> Grade Distribution
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.distribution}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                                        <Tooltip 
                                            cursor={{fill: '#f8fafc'}} 
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {stats.distribution.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pass/Fail Pie */}
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm print:border-black">
                             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <AlertOctagon size={18} className="text-slate-400"/> Outcome Ratio
                            </h3>
                            <div className="h-48 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Passed', value: stats.passedCount, fill: '#10b981' },
                                                { name: 'Failed', value: stats.failedCount, fill: '#ef4444' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-800">{stats.passRate}%</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs font-bold text-slate-600">Passed ({stats.passedCount})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                    <span className="text-xs font-bold text-slate-600">Failed ({stats.failedCount})</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Assessment Performance */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm print:border-black print:break-inside-avoid">
                         <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Target size={18} className="text-slate-400"/> Assessment Performance (Avg %)
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[...stats.quizPerf, ...stats.assignPerf]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} unit="%" />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Legend />
                                    <Line type="monotone" dataKey="percentage" name="Avg Score %" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 justify-center">
                            {stats.quizPerf.map((q, i) => (
                                <div key={i} className="px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100 text-xs font-bold text-indigo-700">
                                    {q.name}: {q.avg}/{q.max}
                                </div>
                            ))}
                             {stats.assignPerf.map((a, i) => (
                                <div key={i} className="px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 text-xs font-bold text-emerald-700">
                                    {a.name}: {a.avg}/{a.max}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 4: Top Students & At Risk */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
                        {/* Top Students */}
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm print:border-black">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Medal size={18} className="text-amber-500"/> Top Performers
                            </h3>
                            <div className="space-y-4">
                                {stats.topStudents.map((s, i) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i===0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                                {i+1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{s.studentName}</p>
                                                <p className="text-[10px] font-mono text-slate-400">{s.studentId}</p>
                                            </div>
                                        </div>
                                        <div className="font-black text-indigo-600 text-lg">
                                            {s.calculatedTotal}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* At Risk Students */}
                         <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm print:border-black">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <AlertOctagon size={18} className="text-rose-500"/> Students At Risk
                            </h3>
                            <div className="space-y-4">
                                {stats.atRiskStudents.length > 0 ? stats.atRiskStudents.map((s, i) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                        <div className="flex items-center gap-4">
                                             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs text-rose-300">
                                                !
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{s.studentName}</p>
                                                <p className="text-[10px] font-mono text-slate-400">{s.studentId}</p>
                                            </div>
                                        </div>
                                        <div className="font-black text-rose-600 text-lg">
                                            {s.calculatedTotal}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center text-slate-400 font-bold italic">
                                        All students are passing! 🎉
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center pt-8 print:hidden">
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                            <Printer size={18} /> Print Analytics Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseStats;
