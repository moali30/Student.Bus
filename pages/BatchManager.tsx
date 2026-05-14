import React, { useState } from 'react';
import { Batch } from '../types';
import { Plus, Edit2, Trash2, XCircle, Calendar, AlertCircle, Loader2, Layers, CheckCircle2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';

const BatchManager: React.FC = () => {
  const { batches, addBatch, updateBatch, removeBatch } = useData();
  const [batchName, setBatchName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;

    if (editingId) {
      const batch = batches.find(b => b.id === editingId);
      if (batch) await updateBatch({ ...batch, name: batchName });
    } else {
      const newBatch: Batch = {
        id: `new_${Date.now()}`,
        name: batchName,
        isActive: batches.length === 0, 
        isArchived: false,
        createdAt: new Date().toISOString()
      };
      await addBatch(newBatch);
    }
    setBatchName('');
    setEditingId(null);
  };

  const executeDelete = async () => {
    if (confirmDeleteId) {
      await removeBatch(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleToggleActive = async (batch: Batch) => {
      await updateBatch({...batch, isActive: true});
  };

  const handleToggleArchive = async (batch: Batch) => {
      await updateBatch({...batch, isArchived: !batch.isArchived, isActive: false});
  };

  return (
    <div className="space-y-10 animate-fade-in-up relative z-10 pb-12">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-purple-50/40 to-transparent -z-10 rounded-[40px] pointer-events-none"></div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in"></div>
              <div className="bg-white/90 backdrop-blur-2xl rounded-[40px] p-10 w-full max-w-md relative z-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] transform animate-scale-up border border-white">
                  <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-100/50">
                      <AlertCircle size={48} strokeWidth={2} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 text-center tracking-tight">Delete Academic Year?</h3>
                  <p className="text-slate-500 font-bold mb-10 text-center leading-relaxed">
                      All courses and student records for this year will be <span className="text-rose-600 font-black">permanently removed</span>. This cannot be undone.
                  </p>
                  <div className="flex gap-4">
                      <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-slate-100/50 hover:bg-slate-100 text-slate-600 rounded-[24px] font-black transition-all hover:scale-105">Keep Records</button>
                      <button onClick={executeDelete} className="flex-1 py-4 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-[24px] font-black shadow-lg shadow-rose-200/50 transition-all active:scale-95 hover:-translate-y-1">Yes, Delete</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-purple-100 text-purple-600 rounded-[24px]">
              <Layers size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Academic Years</h1>
            <p className="text-slate-500 font-bold mt-1">Manage semesters and active system state</p>
          </div>
      </div>

      <div className={`p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ${editingId ? 'bg-amber-50/80 backdrop-blur-xl border border-amber-200/50 ring-4 ring-amber-100/30' : 'bg-white/60 backdrop-blur-xl border border-white/80'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800">
            <div className={`p-3 rounded-2xl ${editingId ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200/50' : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-200/50'}`}>
                {editingId ? <Edit2 size={24} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
            </div>
            {editingId ? 'Rename Academic Year' : 'Initialize New Year'}
          </h3>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setBatchName(''); }} className="px-5 py-2.5 bg-white border border-slate-200/50 rounded-2xl text-xs font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-2">
              <XCircle size={16} /> Cancel Editing
            </button>
          )}
        </div>
        <form onSubmit={handleSaveBatch} className="flex flex-col md:flex-row gap-5">
          <div className="flex-1 relative group">
            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={22} strokeWidth={2.5} />
            <input
              type="text"
              placeholder="e.g. Fall 2024 - 2025"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-[28px] text-lg font-bold text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-purple-100 focus:border-purple-300 transition-all outline-none shadow-inner"
            />
          </div>
          <button type="submit" className={`px-12 py-5 rounded-[28px] font-black text-lg transition-all active:scale-95 text-white ${editingId ? 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:-translate-y-1' : 'bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 shadow-[0_10px_30px_rgba(168,85,247,0.3)] hover:-translate-y-1'}`}>
            {editingId ? 'Update Name' : 'Create Year'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {batches.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((batch) => (
            <div key={batch.id} className={`p-8 rounded-[40px] border transition-all duration-300 relative overflow-hidden group hover:-translate-y-1 ${batch.isActive ? 'bg-white/80 backdrop-blur-xl border-purple-200/50 shadow-[0_20px_40px_rgba(168,85,247,0.15)] ring-2 ring-purple-100' : 'bg-white/50 backdrop-blur-lg border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl'}`}>
                {batch.isActive && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none opacity-50"></div>}
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-3 px-3.5 py-1.5 rounded-xl w-fit flex items-center gap-1.5 ${batch.isActive ? 'bg-purple-100 text-purple-700 border border-purple-200/50' : batch.isArchived ? 'bg-slate-100 text-slate-500 border border-slate-200/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'}`}>
                            {batch.isActive && <CheckCircle2 size={12} />}
                            {batch.isActive ? 'Active System' : batch.isArchived ? 'Archived' : 'Ready'}
                        </span>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{batch.name}</h3>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => { setEditingId(batch.id); setBatchName(batch.name); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-amber-500 hover:border-amber-200 rounded-2xl transition-all">
                            <Edit2 size={18} strokeWidth={2.5} className="pointer-events-none" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteId(batch.id)} className="p-3 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 rounded-2xl transition-all">
                            <Trash2 size={18} strokeWidth={2.5} className="pointer-events-none" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                {!batch.isActive && !batch.isArchived && (
                    <button type="button" onClick={() => handleToggleActive(batch)} className="flex-1 py-4 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-[20px] font-black text-sm shadow-[0_8px_20px_rgba(168,85,247,0.25)] transition-all active:scale-95">Activate Now</button>
                )}
                <button type="button" onClick={() => handleToggleArchive(batch)} className={`flex-1 py-4 bg-white/80 backdrop-blur-sm border border-slate-200/50 text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-[20px] font-black text-sm transition-all shadow-sm ${batch.isActive ? 'col-span-full w-full' : ''}`}>
                    {batch.isArchived ? 'Restore Archive' : 'Archive Year'}
                </button>
                </div>
            </div>
            ))}
        </div>
    </div>
  );
};

export default BatchManager;