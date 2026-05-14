import React from 'react';
import { User, UserRole } from '../types';
import { 
  Users, Layers, BookOpen, AlertTriangle, Shield, 
  GraduationCap, FileSpreadsheet, ArrowRight, Activity, Calendar, Lock 
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { activeBatch, users, batches, courses } = useData();
  const navigate = useNavigate();

  const assignedCourses = user.role === UserRole.ASSISTANT 
      ? courses.filter(c => c.assistantIds?.includes(user.id))
      : (user.role === UserRole.PROFESSOR ? courses.filter(c => c.professorIds?.includes(user.id)) : courses);

  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAdmin = user.role === UserRole.MAIN_ADMIN;
  const isProfessor = user.role === UserRole.PROFESSOR;
  const isAssistant = user.role === UserRole.ASSISTANT;

  const greeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  };

  const QuickActionCard = ({ title, icon: Icon, color, onClick, desc }: any) => (
      <button 
        onClick={onClick}
        className="relative overflow-hidden flex flex-col items-start p-6 bg-white/70 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 group w-full text-left"
      >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
          
          <div className={`p-4 rounded-2xl ${color} text-white mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
              <Icon size={26} strokeWidth={2.5} />
          </div>
          <h3 className="font-black text-slate-800 text-xl mb-2 group-hover:text-indigo-600 transition-colors">{title}</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
          
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              Access Module <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
      </button>
  );

  const StatCard = ({ label, value, icon: Icon, colorClass, borderClass }: any) => (
      <div className={`bg-white/80 backdrop-blur-lg p-6 rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 flex items-center justify-between group`}>
          <div>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1 group-hover:text-slate-500 transition-colors">{label}</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight">{value}</h3>
          </div>
          <div className={`p-4 rounded-[20px] ${colorClass} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
              <Icon size={28} strokeWidth={2.5} />
          </div>
      </div>
  );

  const CourseSnapshot = ({ course }: any) => (
      <div onClick={() => navigate('/grade-entry')} className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-indigo-200 hover:shadow-[0_20px_40px_rgb(99,102,241,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform duration-500 group-hover:scale-150 opacity-50"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1.5 bg-indigo-50/80 text-indigo-700 text-[10px] font-black uppercase rounded-xl tracking-wider border border-indigo-100/50 backdrop-blur-sm">
                    {course.code}
                </span>
                {course.isPublished ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                        <Activity size={12} /> Published
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100/50 backdrop-blur-sm">
                        <Lock size={12} /> Hidden
                    </span>
                )}
            </div>
            <h4 className="font-black text-slate-900 text-xl mb-2 line-clamp-2 flex-1">{course.name}</h4>
            <div className="bg-slate-50/50 rounded-2xl p-3 mb-4 border border-slate-100/50">
               <p className="text-[11px] text-slate-500 uppercase tracking-widest font-black flex items-center justify-between">
                   Target Score <span className="text-slate-800 text-sm">{course.config.totalTargetScore} pts</span>
               </p>
            </div>
            
            <div className="flex items-center justify-between text-indigo-600 text-xs font-black w-full pt-2 border-t border-slate-100/50">
                <span>Manage Grades</span>
                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
            </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-10 animate-fade-in-up pb-12 relative z-10">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-50/40 to-transparent -z-10 rounded-[40px] pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-2xl p-6 md:p-8 rounded-[40px] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
           <h1 className="text-4xl md:text-5xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
               {greeting()}, {user.name.split(' ')[0]}
               {isAdmin && <div className="p-2 bg-rose-50 rounded-2xl"><Shield size={28} className="text-rose-500" /></div>}
               {isSupervisor && <div className="p-2 bg-orange-50 rounded-2xl"><Shield size={28} className="text-orange-500" /></div>}
           </h1>
           <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
               <Calendar size={16} className="text-indigo-400" />
               {activeBatch ? <span className="text-slate-700 font-bold">Active Term: {activeBatch.name}</span> : "No active academic year selected."}
           </p>
        </div>
        
        <div className={`px-8 py-5 rounded-[28px] border flex items-center gap-5 backdrop-blur-xl ${activeBatch ? 'bg-emerald-50/80 border-emerald-100/50 shadow-lg shadow-emerald-100/20' : 'bg-rose-50/80 border-rose-100/50 shadow-lg shadow-rose-100/20'}`}>
            <div className={`p-4 rounded-2xl shadow-sm ${activeBatch ? 'bg-white text-emerald-500' : 'bg-white text-rose-500'}`}>
                {activeBatch ? <Activity size={24} strokeWidth={2.5} /> : <AlertTriangle size={24} strokeWidth={2.5} />}
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${activeBatch ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>System Status</p>
                <p className={`text-lg font-black tracking-tight ${activeBatch ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {activeBatch ? 'Operational' : 'Action Required'}
                </p>
            </div>
            {!activeBatch && isAdmin && (
                <button onClick={() => navigate('/batches')} className="ml-4 px-5 py-2.5 bg-rose-600 text-white text-sm font-black rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200/50 hover:-translate-y-0.5 transition-all">
                    Fix Now
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="My Courses" value={assignedCourses.length} icon={BookOpen} colorClass="bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600" />
          {(isAdmin || isSupervisor) && <StatCard label="Total Staff" value={users.length} icon={Users} colorClass="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600" />}
          {(isAdmin) && <StatCard label="Academic Years" value={batches.length} icon={Layers} colorClass="bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600" />}
          {!activeBatch && (
              <div className="bg-amber-50/80 backdrop-blur-xl p-6 rounded-[32px] border border-amber-100/50 shadow-sm flex flex-col justify-center">
                  <p className="text-amber-800 font-black text-sm mb-2 flex items-center gap-2"><AlertTriangle size={18} strokeWidth={2.5}/> Warning</p>
                  <p className="text-amber-700/80 text-xs font-medium leading-relaxed">Results cannot be entered until an academic year is active.</p>
              </div>
          )}
      </div>

      <div className="bg-white/40 backdrop-blur-3xl p-8 rounded-[40px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
             <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Activity size={20} strokeWidth={2.5}/></div> Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(isProfessor || isAssistant || isAdmin) && <QuickActionCard title="Enter Grades" desc="Input quiz and assignment scores for your courses." icon={FileSpreadsheet} color="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200" onClick={() => navigate('/grade-entry')} />}
              {(isAdmin || isSupervisor) && <QuickActionCard title="Manage Courses" desc="Create new courses or adjust grading configurations." icon={BookOpen} color="bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-200" onClick={() => navigate('/courses')} />}
              {(isAdmin || isSupervisor) && <QuickActionCard title="Staff Directory" desc="Manage professors, assistants and roles." icon={Users} color="bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200" onClick={() => navigate('/users')} />}
              {isAdmin && <QuickActionCard title="Academic Year" desc="Start a new semester or archive old ones." icon={Layers} color="bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-200" onClick={() => navigate('/batches')} />}
          </div>
      </div>

      {assignedCourses.length > 0 && (
          <div className="pt-4">
              <div className="flex justify-between items-end mb-6 px-2">
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                     <div className="p-2.5 bg-indigo-100 rounded-2xl text-indigo-600"><GraduationCap size={24} strokeWidth={2.5}/></div> My Active Courses
                  </h2>
                  {assignedCourses.length > 4 && (
                      <button onClick={() => navigate('/courses')} className="flex items-center gap-1 text-sm font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
                          View All <ArrowRight size={16} />
                      </button>
                  )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {assignedCourses.slice(0, 8).map(course => <CourseSnapshot key={course.id} course={course} />)}
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
