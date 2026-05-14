
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';
import { LogOut, BookOpen, Users, BarChart3, Layers, Menu, X, FileSpreadsheet, Eye, Settings, RefreshCw, Loader2, CheckCircle2, Cloud, TrendingUp } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

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
    {/* Eyebrow */}
    <path d="M3 7.5C6 4.5 14 3.5 21 6.5" strokeWidth="2" />
    {/* Upper Lid */}
    <path d="M2.5 11.5C7 6.5 17 6.5 21.5 11.5" strokeWidth="2" />
    {/* Lower Lid */}
    <path d="M2.5 11.5C7 16.5 17 16.5 21.5 11.5" strokeWidth="2" />
    {/* Pupil */}
    <circle cx="12" cy="11.5" r="3" fill="currentColor" className="opacity-20" />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" />
    {/* Vertical Drop (Tear) */}
    <path d="M12 15.5V20.5" strokeWidth="2" />
    {/* Spiral (Wedjat Mark) - Curving from right side towards center */}
    <path d="M18 14.5C18 18.5 15 20.5 11 19.5" strokeWidth="2" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { isInitialLoading, isSyncing } = useData();

  if (!user) {
    return <>{children}</>;
  }

  if (isInitialLoading) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden">
              {/* Background Decorations */}
              <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>

              <div className="relative z-10 flex flex-col items-center animate-scale-up">
                  <div className="flex items-center gap-5 mb-6">
                      <h1 className="text-8xl font-black tracking-tighter text-slate-900 leading-none" style={{ fontFamily: 'Arial, sans-serif' }}>HUE</h1>
                      <div className="text-indigo-600">
                         <EyeOfHorus size={72} />
                      </div>
                  </div>
                  
                  <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Mental Student Results</h2>
                  
                  <div className="flex items-center gap-3 bg-white/60 border border-slate-100 px-6 py-2.5 rounded-full shadow-sm mt-4">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      <span className="text-sm font-bold text-slate-600">Initializing System Data...</span>
                  </div>
              </div>
              
              <div className="absolute bottom-10 text-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Academic Management System</p>
              </div>
          </div>
      )
  }

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
      <NavLink
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) => `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
          isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </NavLink>
    );
  };

  const isAdmin = user.role === UserRole.MAIN_ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAssistant = user.role === UserRole.ASSISTANT;
  const isProfessor = user.role === UserRole.PROFESSOR;

  const canManageUsers = isAdmin || isSupervisor;
  const canManageCourses = isAdmin || isSupervisor || isAssistant;
  const canManageBatches = isAdmin; 
  const canViewGrades = isAdmin || isAssistant || isProfessor;
  const canViewStats = isAdmin || isSupervisor || isProfessor;
  const canAccessSettings = isAdmin || isSupervisor;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden print:h-auto print:overflow-visible">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out z-30 print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-20 px-6 bg-gray-950 border-b border-gray-800">
          <div className="flex items-center space-x-3">
             <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter text-white leading-none">HUE</h1>
                <EyeOfHorus size={32} className="text-indigo-500" />
             </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-5rem)]">
          <div className="mb-6 px-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Profile</p>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-gray-400 text-xs capitalize">{user.role.replace('_', ' ').toLowerCase()}</p>
              </div>
            </div>
          </div>

          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</p>
          
          <NavItem to="/dashboard" icon={BarChart3} label="Dashboard" />
          
          {canManageBatches && (
            <NavItem to="/batches" icon={Layers} label="Academic Years" />
          )}
          
          {canManageUsers && (
            <NavItem to="/users" icon={Users} label="Staff Management" />
          )}

          {canManageCourses && (
            <NavItem to="/courses" icon={BookOpen} label="Courses" />
          )}

          {canViewGrades && (
             <NavItem 
               to="/grade-entry" 
               icon={isProfessor ? Eye : FileSpreadsheet} 
               label={isProfessor ? "View Grades" : "Grade Entry"} 
             />
          )}

          {canViewStats && (
              <NavItem to="/stats" icon={TrendingUp} label="Statistics" />
          )}

          {canAccessSettings && (
            <div className="pt-4 mt-4 border-t border-gray-800">
               <NavItem to="/settings" icon={Settings} label="Settings" />
            </div>
          )}

        </div>
        
        <div className="absolute bottom-0 w-full p-4 bg-gray-900 border-t border-gray-800">
          <button 
            onClick={onLogout}
            className="flex items-center space-x-3 text-red-400 hover:text-red-300 w-full px-4 py-2 transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Updated with print utility classes */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-100 print:bg-white print:overflow-visible print:h-auto">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 lg:px-8 print:hidden z-20 sticky top-0">
          <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
                <Menu size={24} />
              </button>
              
              {/* Professional Global Status Indicator */}
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${isSyncing ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  {isSyncing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="text-xs font-black uppercase tracking-wide">Syncing Changes...</span>
                      </>
                  ) : (
                      <>
                        <Cloud size={14} />
                        <span className="text-xs font-black uppercase tracking-wide">All Saved</span>
                      </>
                  )}
              </div>
          </div>
          <div className="flex-1 text-right">
             <span className="text-sm text-gray-500">Academic Management System</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-8 print:p-0 print:overflow-visible print:h-auto relative">
           {/* Mobile Status Indicator Overlay (visible only on mobile) */}
           {isSyncing && (
             <div className="md:hidden absolute top-0 left-0 right-0 z-50 bg-amber-100 text-amber-800 text-xs font-bold text-center py-1">
               Syncing Changes...
             </div>
           )}
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
