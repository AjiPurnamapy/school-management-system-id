import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null); // Add User State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newGrade, setNewGrade] = useState(10);
    const [newYear, setNewYear] = useState('2025/2026');
    const [selectedTeacher, setSelectedTeacher] = useState('');

    const [manageClass, setManageClass] = useState(null);
    const [classStudents, setClassStudents] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [studentToAdd, setStudentToAdd] = useState('');
    const [studentsPerClass, setStudentsPerClass] = useState({}); // State untuk menyimpan siswa per kelas
    const { toast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [resClasses, resTeachers, resProfile] = await Promise.all([
                axios.get('/classes/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/users/?role=teacher', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/myprofile', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setClasses(resClasses.data);
            setTeachers(resTeachers.data);
            setCurrentUser(resProfile.data);
            setError(null);
            
            // Auto-fetch siswa untuk setiap kelas
            const classesData = resClasses.data;
            const studentsData = {};
            
            // Fetch siswa secara paralel untuk semua kelas
            await Promise.all(classesData.map(async (cls) => {
                try {
                    const res = await axios.get(`/classes/${cls.id}/students`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    studentsData[cls.id] = res.data;
                } catch (err) {
                    console.warn(`Gagal memuat siswa kelas ${cls.id}`);
                    studentsData[cls.id] = [];
                }
            }));
            
            setStudentsPerClass(studentsData);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post('/classes/', {
                name: newName,
                grade_level: parseInt(newGrade),
                academic_year: newYear,
                wali_kelas_id: selectedTeacher ? parseInt(selectedTeacher) : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Kelas berhasil dibuat!");
            setIsCreating(false);
            setNewName('');
            setSelectedTeacher('');
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Gagal membuat kelas. Pastikan nama unik.");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Hapus Kelas',
            message: 'Yakin hapus kelas ini? Semua data siswa di kelas ini akan terpengaruh.',
            confirmText: 'Ya, Hapus',
            type: 'danger'
        });
        if (!confirmed) return;
        
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Kelas berhasil dihapus!");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menghapus kelas.");
        }
    };

    const openManageModal = async (cls) => {
        setManageClass(cls);
        try {
            const token = localStorage.getItem('token');
            const [resMembers, resAll] = await Promise.all([
                axios.get(`/classes/${cls.id}/students`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/users/?role=student', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setClassStudents(resMembers.data);
            setAvailableStudents(resAll.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data siswa.");
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if(!studentToAdd) return;
        const token = localStorage.getItem('token');
        try {
            await axios.post('/classes/assign-student', {
                user_id: parseInt(studentToAdd),
                class_id: manageClass.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            // Refresh members
            const res = await axios.get(`/classes/${manageClass.id}/students`, { headers: { Authorization: `Bearer ${token}` } });
            setClassStudents(res.data);
            setStudentToAdd('');
            toast.success("Siswa berhasil ditambahkan!");
        } catch (err) {
            console.error(err);
            toast.error("Gagal menambahkan siswa.");
        }
    };


    const getRomanGrade = (n) => {
        if (n == 10) return 'X';
        if (n == 11) return 'XI';
        if (n == 12) return 'XII';
        return n;
    };

    // if (loading) return ... (REMOVED to fix layout shift)
    
    return (
        <div className="glass-card p-5 animate-fade-in" style={{ minHeight: '80vh', transition: 'height 0.3s ease' }}>
            {/* Header Section */}
            <div className="flex-between align-center mb-5">
                <div>
                    <h2 className="mb-1" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.025em' }}>Daftar Kelas & Siswa 📚</h2>
                    <p className="text-muted m-0" style={{fontSize: '1rem'}}>Lihat daftar anggota kelas dan informasi wali kelas.</p>
                </div>
                
                {/* Tombol Tambah Kelas - HANYA untuk Admin dan Kepala Sekolah */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'principal') && (
                    <button 
                        onClick={() => setIsCreating(!isCreating)} 
                        className="btn-primary"
                        style={{
                            width: 'auto', 
                            padding: '12px 24px', 
                            borderRadius: '12px',
                            background: isCreating ? '#ef4444' : '#22c55e',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isCreating ? 'Tutup Form' : '➕ Tambah Kelas'}
                    </button>
                )}
            </div>

            {/* CREATE CLASS FORM */}
            {isCreating && (
                <form onSubmit={handleCreateClass} className="glass-card mb-6 animate-slide-down" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ padding: '20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <h3 className="m-0 text-lg font-bold" style={{ color: '#334155' }}>Input Kelas Baru</h3>
                         <button type="button" onClick={() => setIsCreating(false)} style={{ border:'none', background:'transparent', color:'#94a3b8', cursor:'pointer' }}>&times;</button>
                    </div>
                    
                    <div style={{ padding: '24px' }}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <div className="form-group mb-0">
                                <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#64748b'}}>Nama Kelas</label>
                                <input 
                                    type="text" className="form-control" 
                                    placeholder="Contoh: X-RPL-1" required 
                                    value={newName} onChange={e => setNewName(e.target.value)}
                                    style={{ padding: '12px', fontSize: '0.95rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%' }}
                                />
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#64748b'}}>Tingkat</label>
                                <select 
                                    className="form-control" 
                                    value={newGrade} onChange={e => setNewGrade(e.target.value)}
                                    style={{ padding: '12px', fontSize: '0.95rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%' }}
                                >
                                    <option value="10">Kelas 10 (X)</option>
                                    <option value="11">Kelas 11 (XI)</option>
                                    <option value="12">Kelas 12 (XII)</option>
                                </select>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#64748b'}}>Tahun Ajaran</label>
                                <select 
                                    className="form-control"
                                    value={newYear} onChange={e => setNewYear(e.target.value)}
                                    style={{ padding: '12px', fontSize: '0.95rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%' }}
                                >
                                    <option value="2024/2025">2024/2025</option>
                                    <option value="2025/2026">2025/2026</option>
                                    <option value="2026/2027">2026/2027</option>
                                </select>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#64748b'}}>Wali Kelas</label>
                                
                                {/* LOGIC: Jika Admin -> Dropdown. Jika Guru -> Auto set to self (tampilkan read-only/hidden) */}
                                {currentUser?.role === 'admin' ? (
                                    <select 
                                        className="form-control"
                                        value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                                        style={{ padding: '12px', fontSize: '0.95rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%' }}
                                    >
                                        <option value="">-- Pilih Guru --</option>
                                        {Array.isArray(teachers) && teachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        className="form-control"
                                        value={currentUser?.name || ''} 
                                        disabled
                                        style={{ padding: '12px', fontSize: '0.95rem', background: '#e2e8f0', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', width: '100%' }}
                                        title="Anda akan otomatis menjadi wali kelas ini"
                                    />
                                )}
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                             <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px', fontWeight: '600', borderRadius: '8px', boxShadow: 'none' }}>
                                ✨ Simpan Kelas
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* CLASS CARDS - New Card-Based Layout */}
            <div style={{ minHeight: '300px' }}>
                {loading ? (
                    <div className="flex-center flex-col py-20 text-slate-400">
                        <div className="spinner mb-3"></div>
                        <p className="text-slate-500 font-bold">Memuat data kelas...</p>
                    </div>
                ) : error ? (
                    <div className="text-center p-10 text-red-500 font-bold">
                        {error}
                    </div>
                ) : (() => {
                    // FILTER: Siswa hanya lihat kelasnya sendiri
                    const displayClasses = currentUser?.role === 'student' 
                        ? classes.filter(c => c.id === currentUser?.class_id)
                        : classes;
                    
                    // Jika siswa belum punya kelas
                    if (currentUser?.role === 'student' && displayClasses.length === 0) {
                        return (
                            <div className="text-center p-10 bg-white rounded-xl border border-slate-200">
                                <div style={{ fontSize: '3rem', marginBottom: '15px', color: '#fbbf24' }}>🎒</div>
                                <p style={{ color: '#64748b', fontWeight: '600' }}>Kamu belum dimasukkan ke dalam kelas.</p>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Hubungi guru atau admin untuk didaftarkan ke kelas.</p>
                            </div>
                        );
                    }
                    
                    if (displayClasses.length === 0) {
                        return (
                            <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-300">
                                <div style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}>📭</div>
                                <p style={{ color: '#94a3b8', fontWeight: '500' }}>Belum ada data kelas yang dibuat.</p>
                            </div>
                        );
                    }
                    
                    return (
                        <div className="grid grid-cols-1 gap-6">
                            {displayClasses.map((cls, index) => (
                                <div 
                                    key={cls.id} 
                                    className="animate-fade-in"
                                    style={{ 
                                        background: 'white', 
                                        borderRadius: '16px', 
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                        overflow: 'hidden',
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    {/* CLASS HEADER */}
                                    <div style={{ 
                                        padding: '24px', 
                                        borderBottom: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                    }}>
                                        {/* Left: Class Info */}
                                        <div>
                                            <h3 style={{ 
                                                fontSize: '1.5rem', 
                                                fontWeight: '800', 
                                                color: '#1e293b',
                                                margin: 0,
                                                marginBottom: '12px'
                                            }}>
                                                {cls.name}
                                            </h3>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>
                                                    <strong>Wali Kelas :</strong>{' '}
                                                    {cls.wali_kelas_id 
                                                        ? teachers.find(t => t.id === cls.wali_kelas_id)?.name || `Guru #${cls.wali_kelas_id}`
                                                        : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diset</span>
                                                    }
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>
                                                    <strong>Tahun Ajaran :</strong> {cls.academic_year}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Right: Action Buttons - Only for Admin/Teacher */}
                                        {currentUser?.role !== 'student' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => openManageModal(cls)}
                                                    style={{
                                                        background: '#22c55e', 
                                                        color: 'white',
                                                        border: 'none', 
                                                        padding: '10px 20px', 
                                                        borderRadius: '8px',
                                                        cursor: 'pointer', 
                                                        fontWeight: '600', 
                                                        fontSize: '0.85rem',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.background = '#16a34a'}
                                                    onMouseOut={(e) => e.target.style.background = '#22c55e'}
                                                >
                                                    ➕ Tambah Siswa
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cls.id)}
                                                    style={{ 
                                                        background: 'transparent', 
                                                        color: '#ef4444', 
                                                        border: '1px solid #fecaca', 
                                                        padding: '10px 16px', 
                                                        borderRadius: '8px', 
                                                        cursor: 'pointer', 
                                                        fontSize: '0.9rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {e.target.style.background = '#fee2e2';}}
                                                    onMouseOut={(e) => {e.target.style.background = 'transparent';}}
                                                    title="Hapus Kelas"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* STUDENT TABLE */}
                                    <div style={{ padding: '0' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIS</th>
                                                    <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tingkat</th>
                                                    <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama Siswa</th>
                                                    <th style={{ padding: '14px 20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alamat</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Tampilkan siswa langsung dari studentsPerClass */}
                                                {(!studentsPerClass[cls.id] || studentsPerClass[cls.id].length === 0) ? (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <span>📭</span>
                                                                <span>Belum ada siswa di kelas ini</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    studentsPerClass[cls.id].map((student, idx) => (
                                                        <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                                                            <td style={{ padding: '14px 20px', color: '#475569', fontWeight: '500' }}>{student.nis || '-'}</td>
                                                            <td style={{ padding: '14px 20px', color: '#475569' }}>{getRomanGrade(cls.grade_level)}</td>
                                                            <td style={{ padding: '14px 20px', color: '#334155', fontWeight: '600' }}>{student.name}</td>
                                                            <td style={{ padding: '14px 20px', color: '#64748b' }}>{student.address || '-'}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* MODAL MANAGE MEMBERS */}
            {manageClass && (
                <div style={{
                    position:'fixed', top:0, left:0, right:0, bottom:0, 
                background:'rgba(15, 23, 42, 0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
                backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-card animate-slide-down" style={{width:'600px', maxHeight:'80vh', overflowY:'auto', background:'white', padding:'32px', borderRadius:'24px', border:'1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
                        <div className="flex-between align-center mb-6">
                            <div>
                                <h3 className="m-0 text-xl font-bold text-slate-800">Anggota Kelas</h3>
                                <p className="text-muted m-0 mt-1">{manageClass.name} — {manageClass.academic_year}</p>
                            </div>
                            <button onClick={() => setManageClass(null)} className="hover:bg-slate-100 p-2 rounded-full transition-colors" style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8', lineHeight:1}}>&times;</button>
                        </div>
                        
                        {/* ADD STUDENT FORM - Hanya untuk Admin/Guru */}
                        {currentUser?.role !== 'student' && (
                            <form onSubmit={handleAddStudent} className="flex-center gap-3 mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex-1">
                                    <select className="form-control" value={studentToAdd} onChange={e => setStudentToAdd(e.target.value)} required 
                                        style={{background:'white'}}>
                                        <option value="">-- Pilih Siswa Untuk Ditambahkan --</option>
                                        {Array.isArray(availableStudents) && availableStudents.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {s.class_id ? `(Pindah dari Kelas #${s.class_id})` : '(Belum punya kelas)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary" style={{width:'auto', whiteSpace:'nowrap', padding:'12px 20px', fontSize:'0.9rem'}}>+ Masukkan</button>
                            </form>
                        )}

                        {/* STUDENT LIST */}
                        <div style={{border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden'}}>
                            <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th style={{padding:'16px', fontSize:'0.85rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase'}}>Nama Siswa</th>
                                        <th style={{padding:'16px', fontSize:'0.85rem', fontWeight:'700', color:'#64748b', textTransform:'uppercase'}}>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(classStudents) && classStudents.map(s => (
                                        <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td style={{padding:'16px', fontWeight:'600', color:'#334155'}}>{s.name}</td>
                                            <td style={{padding:'16px', color:'#64748b'}}>{s.email}</td>
                                        </tr>
                                    ))}
                                    {classStudents.length === 0 && (
                                        <tr><td colSpan="2" className="text-center p-8 text-slate-400 italic">Belum ada siswa di kelas ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
