import React, { useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { UserCog, Lock, Save, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AdminSettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ user, onUpdateUser }) => {
  // Profile State
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility State
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI State
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = { ...user, name: name.trim(), username: username.trim() };
      StorageService.saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert DB password to string safely to handle Number/String mismatch from Google Sheets
    const storedPassword = String(user.password || '');
    
    // Basic validation
    if (storedPassword && storedPassword !== currentPassword && storedPassword !== currentPassword.trim()) {
      setMessage({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }

    if (newPassword.length < 3) {
      setMessage({ type: 'error', text: 'New password must be at least 3 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      // Include current name/username state to ensure pending changes are also saved
      const updatedUser = { 
        ...user, 
        name: name.trim(),
        username: username.trim(),
        password: newPassword.trim() 
      };
      StorageService.saveUser(updatedUser);
      onUpdateUser(updatedUser); // Update global state
      
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update password.' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
          <UserCog size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">Account Settings</h1>
          <p className="text-gray-500 font-medium">Manage your personal information and security.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Information */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <UserCog size={20} className="text-indigo-500" /> Profile Information
          </h3>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
            </div>
            <div className="pt-4">
              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Save size={20} /> Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Lock size={20} className="text-rose-500" /> Security
          </h3>
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Current Password</label>
              <div className="relative">
                <input 
                  type={showCurrent ? "text" : "password"} 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full p-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                   {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">New Password</label>
              <div className="relative">
                <input 
                  type={showNew ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="New password"
                  className="w-full p-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                   {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirm ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm new password"
                  className="w-full p-4 pr-12 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                   {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="pt-4">
              <button type="submit" className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Save size={20} /> Update Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;