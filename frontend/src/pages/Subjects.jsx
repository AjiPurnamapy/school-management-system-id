import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Subjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]); // Add Teachers State
    const [currentUser, setCurrentUser] = useState(null); // Add State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(''); // Add Teacher Selection State
    const { toast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [resSubjects, resProfile, resTeachers] = await Promise.all([
                axios.get('/subjects/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/myprofile', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/users/?role=teacher', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setSubjects(resSubjects.data);
            setCurrentUser(resProfile.data);
            setTeachers(resTeachers.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data mata pelajaran.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post('/subjects/', {
                name: newName,
                code: newCode,
                teacher_id: selectedTeacher ? parseInt(selectedTeacher) : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Mata Pelajaran berhasil dibuat!");
            setIsCreating(false);
            setNewName('');
            setNewCode('');
            setSelectedTeacher('');
            fetchSubjects();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal membuat mata pelajaran.");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Hapus Mata Pelajaran',
            message: 'Yakin hapus mata pelajaran ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger'
        });
        if (!confirmed) return;
        
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/subjects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Mata pelajaran berhasil dihapus!");
            fetchSubjects();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menghapus mata pelajaran.");
        }
    };

    return (
        <div className="glass-card p-5 animate-fade-in" style={{ minHeight: '80vh', transition: 'height 0.3s ease' }}>
            {/* Header Section */}
            <div className="flex-between align-center mb-5">
                <div>
                    <h2 className="mb-1" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.025em' }}>Mata Pelajaran 📚</h2>
                    <p className="text-muted m-0" style={{fontSize: '1rem'}}>
                        {currentUser?.role === 'student' 
                            ? 'Daftar mata pelajaran yang kamu ikuti.' 
                            : 'Kelola daftar mata pelajaran sekolah.'}
                    </p>
                </div>
                {/* Action Button */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'principal') && (
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="btn-primary"
                        style={{
                            width: 'auto', 
                            padding: '12px 24px', 
                            borderRadius: '12px',
                            background: '#22c55e',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        ➕ Tambah Mapel
                    </button>
                )}
            </div>

            {/* SUBJECT TABLE */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minHeight: '300px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kode</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nama Mata Pelajaran</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guru Pengampu</th>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'principal') && (
                                <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Aksi</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="text-center p-10">
                                    <div className="flex-center flex-col py-10">
                                        <div className="spinner mb-3"></div>
                                        <p className="text-slate-500 font-bold">Memuat data mapel...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="3" className="text-center p-10 text-red-500 font-bold">{error}</td>
                            </tr>
                        ) : subjects.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="text-center p-5">
                                    <div style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}>📭</div>
                                    <p style={{ color: '#94a3b8', fontWeight: '500' }}>Belum ada data mata pelajaran.</p>
                                </td>
                            </tr>
                        ) : (
                            subjects.map((sub, index) => (
                                <tr key={sub.id} className="hover:bg-slate-50 animate-fade-in" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', animationDelay: `${index * 50}ms` }}>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{
                                            background: '#f1f5f9', color: '#475569',
                                            padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600',
                                            fontFamily: 'monospace'
                                        }}>
                                            {sub.code}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px', fontWeight: '600', color: '#334155' }}>
                                        {sub.name}
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        {sub.teacher_id ? (
                                            <div className="flex align-center gap-2">
                                                <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:'bold', color:'#64748b'}}>
                                                    G
                                                </div>
                                                <span className="text-sm text-slate-600">
                                                    {teachers.find(t => t.id === sub.teacher_id)?.name || `Guru #${sub.teacher_id}`}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400 italic">-- Belum ada --</span>
                                        )}
                                    </td>
                                    {(currentUser?.role === 'admin' || currentUser?.role === 'principal') && (
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleDelete(sub.id)}
                                                    style={{ 
                                                        background: 'transparent', color: '#ef4444', 
                                                        border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', 
                                                        cursor: 'pointer', fontSize: '0.9rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {e.target.style.background = '#fee2e2'; e.target.style.borderColor = '#fca5a5'}}
                                                    onMouseOut={(e) => {e.target.style.background = 'transparent'; e.target.style.borderColor = '#e2e8f0'}}
                                                    title="Hapus Mapel"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CREATE MODAL */}
            {isCreating && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="glass-card animate-slide-down" style={{
                        width: '450px', background: 'white', padding: '32px', 
                        borderRadius: '24px', border: '1px solid #e2e8f0',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div className="flex-between align-center mb-8">
                             <div>
                                <h3 className="m-0 text-xl font-bold text-slate-800">Tambah Mapel</h3>
                                <p className="text-xs text-slate-500 mt-1">Masukkan detail mata pelajaran baru</p>
                             </div>
                             <button onClick={() => setIsCreating(false)} 
                                className="hover:bg-slate-100 p-2 rounded-full transition-colors"
                                style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8', lineHeight: 1}}>
                                &times;
                             </button>
                        </div>
                        
                        <form onSubmit={handleCreateSubject}>
                            <div className="mb-6 space-y-5">
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Nama Mata Pelajaran</label>
                                    <div className="form-input-wrapper">
                                        <span className="form-input-icon">📘</span>
                                        <input 
                                            type="text" className="form-control with-icon" 
                                            placeholder="Contoh: Matematika Wajib" required 
                                            value={newName} onChange={e => setNewName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Kode Mata Pelajaran</label>
                                    <div className="form-input-wrapper">
                                        <span className="form-input-icon">🔖</span>
                                        <input 
                                            type="text" className="form-control with-icon" 
                                            placeholder="Contoh: MTK-10" required 
                                            value={newCode} onChange={e => setNewCode(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 ml-1">Kode unik untuk identifikasi mata pelajaran.</p>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Guru Pengampu (Koordinator)</label>
                                    <select 
                                        className="form-control"
                                        value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                                        style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc' }}
                                    >
                                        <option value="">-- Pilih Guru --</option>
                                        {Array.isArray(teachers) && teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex pt-2 gap-3">
                                 <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary flex-1" style={{
                                     padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', 
                                     background: 'white', color: '#64748b', cursor:'pointer', fontWeight: '600'
                                 }}>Batal</button>
                                 <button type="submit" className="btn-primary flex-1">
                                    Simpan Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subjects;
