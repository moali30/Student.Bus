import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types';
import { 
    Trash2, Edit2, Plus, XCircle, Shield, GraduationCap, 
    ClipboardList, AlertCircle, Eye, EyeOff, Search, 
    Users, UserCheck, ShieldCheck, X, Lock, Key, Mail, UserPlus
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface UserManagerProps {
    currentUser: User;
}

const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
    const { users, addUser, updateUser, removeUser } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserRole>(UserRole.ASSISTANT);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const isSupervisor = currentUser.role === UserRole.SUPERVISOR;

    const stats = useMemo(() => ({
        total: users.length,
        profs: users.filter(u => u.role === UserRole.PROFESSOR).length,
        assts: users.filter(u => u.role === UserRole.ASSISTANT).length,
        supers: users.filter(u => u.role === UserRole.SUPERVISOR || u.role === UserRole.MAIN_ADMIN).length,
    }), [users]);

    const existingMainAdmin = users.find(u => u.role === UserRole.MAIN_ADMIN);
    const isMainAdminSlotTaken = !!existingMainAdmin && existingMainAdmin.id !== editingId;

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (role === UserRole.MAIN_ADMIN) {
            if (currentUser.username !== 'admin' && currentUser.username !== 'moasim') {
                alert("Security Alert: Only the root administrator can assign the Main Admin role.");
                return;
            }
            if (isMainAdminSlotTaken) {
                alert("Operation Failed: There can only be ONE Main Admin in the system.");
                return;
            }
        }

        let finalPassword = password.trim();
        if (editingId && !finalPassword) {
            const existingUser = users.find(u => u.id === editingId);
            if (existingUser && existingUser.password) {
                finalPassword = existingUser.password;
            }
        }

        const userToSave: User = {
            id: editingId || `new_${Date.now()}`,
            name: name.trim(),
            username: username.trim(),
            password: finalPassword || undefined,
            role,
            assignedCourseIds: editingId ? (users.find(u => u.id === editingId)?.assignedCourseIds || []) : []
        };
        
        if (editingId) {
            await updateUser(userToSave);
        } else {
            await addUser(userToSave);
        }
        resetForm();
    };

    const resetForm = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setName('');
        setUsername('');
        setPassword('');
        setShowPassword(false);
        setRole(UserRole.ASSISTANT);
    };

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setName(user.name);
        setUsername(user.username);
        setRole(user.role);
        setIsModalOpen(true);
    };

    const executeDelete = async () => {
        if (confirmDeleteId) {
            const targetUser = users.find(u => u.id === confirmDeleteId);
            if (targetUser?.role === UserRole.MAIN_ADMIN) {
                 if (currentUser.username !== 'admin' && currentUser.username !== 'moasim') {
                     alert("Security Alert: Only the root administrator can delete a Main Admin account.");
                     setConfirmDeleteId(null);
                     return;
                 }
                 const mainAdminCount = users.filter(u => u.role === UserRole.MAIN_ADMIN).length;
                 if (mainAdminCount <= 1) {
                     alert("Cannot delete the only Main Admin account.");
                     setConfirmDeleteId(null);
                     return;
                 }
            }
            await removeUser(confirmDeleteId);
            setConfirmDeleteId(null);
        }
    };

    const canModify = (targetUser: User) => {
        if (targetUser.id === currentUser.id) return false; 
        if (currentUser.role === UserRole.SUPERVISOR) {
            if (targetUser.role === UserRole.MAIN_ADMIN || targetUser.role === UserRole.SUPERVISOR) return false;
        }
        return true;
    };

    const roleIcon = (r: UserRole) => {
        switch(r) {
            case UserRole.MAIN_ADMIN: return <ShieldCheck className="text-rose-600" size={18}/>;
            case UserRole.SUPERVISOR: return <Shield className="text-amber-500" size={18}/>;
            case UserRole.PROFESSOR: return <GraduationCap className="text-indigo-600" size={18}/>;
            case UserRole.ASSISTANT: return <ClipboardList className="text-emerald-600" size={18}/>;
        }
    };

    const roleStyles = (r: UserRole) => {
        switch(r) {
            case UserRole.MAIN_ADMIN: return "bg-rose-50 border-rose-100/50 text-rose-700 shadow-sm";
            case UserRole.SUPERVISOR: return "bg-amber-50 border-amber-100/50 text-amber-700 shadow-sm";
            case UserRole.PROFESSOR: return "bg-indigo-50 border-indigo-100/50 text-indigo-700 shadow-sm";
            default: return "bg-emerald-50 border-emerald-100/50 text-emerald-700 shadow-sm";
        }
    };

    const StatBlock = ({ label, value, icon: Icon, color }: any) => (
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:shadow-lg transition-all duration-300 group">
            <div className={`p-4 rounded-2xl ${color} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 group-hover:text-slate-500 transition-colors">{label}</p>
                <p className="text-3xl font-black text-slate-800 leading-none tracking-tight">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in-up pb-12 relative z-10">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50/40 to-transparent -z-10 rounded-[40px] pointer-events-none"></div>

            {/* Staff Editor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in" onClick={resetForm}></div>
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative z-10 overflow-hidden animate-scale-up border border-white">
                        <div className="p-8 border-b border-slate-100/50 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-[20px] shadow-sm ${editingId ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                                    {editingId ? <Edit2 size={24} strokeWidth={2.5}/> : <UserPlus size={24} strokeWidth={2.5}/>}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingId ? 'Update Profile' : 'Register Member'}</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Access control & credentials</p>
                                </div>
                            </div>
                            <button onClick={resetForm} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[20px] shadow-sm transition-all active:scale-95"><X size={20} strokeWidth={2.5}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6 bg-white/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                                    <div className="relative group">
                                        <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input className="ui-input pl-14 pr-4" value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Dr. Ahmed Ali" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input className="ui-input pl-14 pr-4" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="unique_handle" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">System Password</label>
                                    <div className="relative group">
                                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                        <input className="ui-input pl-14 pr-14" type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={editingId ? 'Keep existing' : 'Min 8 chars'} required={!editingId} minLength={8} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Role</label>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {roleIcon(role)}
                                        </div>
                                        <select className="ui-input pl-14 pr-4 appearance-none cursor-pointer" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                                            <option value={UserRole.ASSISTANT}>Teaching Assistant</option>
                                            <option value={UserRole.PROFESSOR}>Academic Professor</option>
                                            {(currentUser.role === UserRole.MAIN_ADMIN) && <option value={UserRole.SUPERVISOR}>Supervisor</option>}
                                            {(currentUser.username === 'admin' || currentUser.username === 'moasim') && <option value={UserRole.MAIN_ADMIN} disabled={isMainAdminSlotTaken}>Main Administrator</option>}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={resetForm} className="flex-1 ui-btn-soft">Discard</button>
                                <button type="submit" className={`flex-[2] min-h-[52px] px-6 rounded-[24px] font-black text-lg text-white shadow-xl transition-all hover:-translate-y-1 active:scale-95 ${editingId ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_10px_30px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_10px_30px_rgba(79,70,229,0.3)]'}`}>
                                    {editingId ? 'Update Identity' : 'Confirm Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md animate-fade-in" onClick={() => setConfirmDeleteId(null)}></div>
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[40px] p-10 w-full max-w-sm relative z-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-scale-up border border-white text-center">
                        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-100/50">
                            <AlertCircle size={48} strokeWidth={2} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Revoke Access?</h3>
                        <p className="text-slate-500 font-bold mb-10 leading-relaxed">This member will lose all system access <span className="text-rose-600 font-black">immediately</span>. This is irreversible.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-slate-100/80 text-slate-600 rounded-[24px] font-black hover:bg-slate-200 transition-all hover:scale-105">Keep Member</button>
                            <button onClick={executeDelete} className="flex-1 py-4 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-[24px] font-black shadow-lg shadow-rose-200/50 transition-all active:scale-95 hover:-translate-y-1">Yes, Revoke</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-[24px]">
                        <Users size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Staff Management</h1>
                        <p className="text-slate-500 font-bold mt-1">Manage academic team access and security hierarchy.</p>
                    </div>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-8 min-h-[52px] rounded-[24px] font-black shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:-translate-y-1 transition-all active:scale-95"
                >
                    <Plus size={22} strokeWidth={2.5} /> Register New Staff
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBlock label="Active Staff" value={stats.total} icon={Users} color="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700" />
                <StatBlock label="Professors" value={stats.profs} icon={GraduationCap} color="bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700" />
                <StatBlock label="Assistants" value={stats.assts} icon={ClipboardList} color="bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700" />
                <StatBlock label="Supervisors" value={stats.supers} icon={ShieldCheck} color="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700" />
            </div>

            {/* Search & Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
                <div className="p-8 border-b border-slate-100/50 flex flex-col md:flex-row items-center justify-between gap-5 bg-white/50">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            placeholder="Find member by name or username..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-200/50 rounded-[24px] font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all text-base"
                        />
                    </div>
                    {isSupervisor && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50/80 backdrop-blur-sm px-5 py-3 rounded-[20px] border border-amber-100/50 text-[10px] font-black uppercase tracking-widest shadow-sm">
                            <Lock size={16}/> Supervisor Permissions Active
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100/50">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Authority Level</th>
                                <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Details</th>
                                <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Status</th>
                                <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 bg-white/40">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border w-fit backdrop-blur-sm ${roleStyles(u.role)}`}>
                                            {roleIcon(u.role)}
                                            <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{u.role.replace('_', ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center font-black text-slate-600 uppercase text-lg shadow-sm">
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-lg">{u.name}</p>
                                                <p className="text-sm text-slate-400 font-bold">@{u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className="relative flex h-3 w-3">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </div>
                                            <span className="text-xs font-black text-slate-500 tracking-wide uppercase">Authorized</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canModify(u) ? (
                                                <>
                                                    <button onClick={() => handleEdit(u)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50 shadow-sm rounded-xl transition-all hover:-translate-y-0.5">
                                                        <Edit2 size={18} strokeWidth={2.5}/>
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteId(u.id)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 shadow-sm rounded-xl transition-all hover:-translate-y-0.5">
                                                        <Trash2 size={18} strokeWidth={2.5}/>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase px-4 bg-slate-50 rounded-xl py-2.5 border border-slate-100">
                                                    {u.id === currentUser.id ? 'Current User' : 'Immutable'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center space-y-5">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Users size={40} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold text-lg">No matching staff members found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
