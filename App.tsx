
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole } from './types';
import { StorageService } from './services/storage';
import { Eye, EyeOff } from 'lucide-react';
import { DataProvider } from './contexts/DataContext';

// Pages

import Dashboard from './pages/Dashboard';
import StudentPortal from './pages/StudentPortal';
import Layout from './components/Layout';
import BatchManager from './pages/BatchManager';
import UserManager from './pages/UserManager';
import CourseManager from './pages/CourseManager';
import GradeEntry from './pages/GradeEntry';
import MarkListPrint from './pages/MarkListPrint';
import AdminSettings from './pages/AdminSettings';
import CourseStats from './pages/CourseStats';

// Custom Eye of Horus Icon for Login Page branding
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

const LoginPage = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        const user = await StorageService.login(username, password);
        if (user) {
            onLogin(user);
        } else {
            setError('بيانات الدخول غير صحيحة');
        }
    } catch (err) {
        setError('Connection Error: ' + err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/50 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="ui-card p-7 md:p-10 w-full max-w-md md:max-w-lg relative z-10 animate-fade-in-up">
        <div className="text-center mb-10 relative">
           <div className="flex justify-center mb-6 relative">
             <div className="absolute inset-0 bg-indigo-50 rounded-full blur-2xl transform scale-150"></div>
             <div className="flex items-center gap-4 relative z-10">
                <h1 className="text-6xl font-black tracking-tighter text-indigo-900 leading-none" style={{ fontFamily: 'Arial, sans-serif' }}>HUE</h1>
                <EyeOfHorus size={56} className="text-indigo-600 drop-shadow-md" />
             </div>
           </div>
           <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Mental Student Results</h1>
           <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[11px]">Staff Access Portal</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">اسم المستخدم</label>
            <input 
              className="ui-input" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Username"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">كلمة المرور</label>
            <div className="relative group">
              <input 
                className="ui-input pr-14" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-rose-50/80 backdrop-blur-sm text-rose-600 p-4 rounded-[20px] text-sm font-black text-center border border-rose-100 shadow-sm animate-scale-up">
              {error}
            </div>
          )}
          <button disabled={loading} className="w-full ui-btn-primary text-lg">
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <div className="mt-10 text-center pt-8 border-t border-slate-100/50 flex flex-col gap-4">
             <Link to="/" className="text-sm font-black text-indigo-500 hover:text-indigo-700 transition-colors flex items-center justify-center gap-2 group">
                <span className="group-hover:-translate-x-1 transition-transform">العودة لبوابة الطلاب</span>
                <span dir="ltr" className="group-hover:translate-x-1 transition-transform">←</span>
             </Link>
        </div>
        
        <div className="mt-6 pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
               تم إعداد البرنامج من خلال <br/>
               <span className="text-indigo-600 font-black">لجنة القياس والتقويم</span>
            </p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
     const checkSession = async () => {
       const currentUser = await StorageService.getCurrentUser();
       if (currentUser) {
         setUser(currentUser);
         localStorage.setItem('edugrade_current_user', JSON.stringify(currentUser));
       } else {
         const saved = localStorage.getItem('edugrade_current_user');
         if (saved) {
           try { setUser(JSON.parse(saved)); } catch (e) {}
         }
       }
     };
     checkSession();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('edugrade_current_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('edugrade_current_user');
    StorageService.logout();
  };

  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<StudentPortal />} />
          
          {/* Login */}
          <Route path="/login" element={
              user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
          } />

          {/* Protected Routes */}
          <Route path="/*" element={
              user ? (
                  <Layout user={user} onLogout={handleLogout}>
                      <Routes>
                          <Route path="/dashboard" element={<Dashboard user={user} />} />
                          <Route path="/batches" element={user.role === UserRole.MAIN_ADMIN ? <BatchManager /> : <Navigate to="/dashboard"/>} />
                          <Route path="/users" element={
                              (user.role === UserRole.MAIN_ADMIN || user.role === UserRole.SUPERVISOR) 
                              ? <UserManager currentUser={user} /> 
                              : <Navigate to="/dashboard"/>
                          } />
                          <Route path="/courses" element={
                              (user.role === UserRole.MAIN_ADMIN || user.role === UserRole.SUPERVISOR || user.role === UserRole.ASSISTANT) 
                              ? <CourseManager user={user} />
                              : <Navigate to="/dashboard"/>
                          } />
                          <Route path="/grade-entry" element={
                              (user.role === UserRole.MAIN_ADMIN || user.role === UserRole.ASSISTANT || user.role === UserRole.PROFESSOR)
                              ? <GradeEntry user={user} />
                              : <Navigate to="/dashboard"/>
                          } />
                          
                          {/* Updated Statistics Page with user prop */}
                          <Route path="/stats" element={
                              (user.role === UserRole.MAIN_ADMIN || user.role === UserRole.SUPERVISOR || user.role === UserRole.PROFESSOR || user.role === UserRole.ASSISTANT)
                              ? <CourseStats user={user} />
                              : <Navigate to="/dashboard"/>
                          } />

                          <Route path="/settings" element={
                              (user.role === UserRole.MAIN_ADMIN || user.role === UserRole.SUPERVISOR)
                              ? <AdminSettings user={user} onUpdateUser={handleLogin} />
                              : <Navigate to="/dashboard"/>
                          } />

                          {/* Print Route */}
                          <Route path="/print-marklist/:courseId" element={<MarkListPrint />} />
                          
                          <Route path="*" element={<Navigate to="/dashboard" />} />
                      </Routes>
                  </Layout>
              ) : (
                  <Navigate to="/login" />
              )
          } />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
};

export default App;
