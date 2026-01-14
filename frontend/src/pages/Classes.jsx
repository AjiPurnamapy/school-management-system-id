import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [resClasses, resTeachers] = await Promise.all([
                axios.get('/classes/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/users/?role=teacher', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setClasses(resClasses.data);
            setTeachers(resTeachers.data);
            setError(null);
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
            alert("Kelas berhasil dibuat!");
            setIsCreating(false);
            setNewName('');
            setSelectedTeacher('');
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Gagal membuat kelas. Pastikan nama unik.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Yakin hapus kelas ini?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/classes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus kelas.");
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
            alert("Gagal memuat data siswa.");
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
            alert("Siswa berhasil ditambahkan!");
        } catch (err) {
            console.error(err);
            alert("Gagal menambahkan siswa.");
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
                    <h2 className="mb-1" style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.025em' }}>Manajemen Kelas 🏫</h2>
                    <p className="text-muted m-0" style={{fontSize: '1rem'}}>Kelola data akademik dan wali kelas.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(!isCreating)} 
                    className="btn-primary"
                    style={{
                        width: 'auto', 
                        padding: '12px 24px', 
                        borderRadius: '12px',
                        background: isCreating ? '#ef4444' : '#4f46e5',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isCreating ? 'Tutup Form' : '➕ Tambah Kelas'}
                </button>
            </div>

            {/* CREATE CLASS FORM */}
            {isCreating && (
                <form onSubmit={handleCreateClass} className="glass-card mb-5 animate-slide-down" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
                    <div className="flex-between align-center mb-6">
                         <h3 className="m-0 text-lg font-bold" style={{ color: '#334155' }}>Input Kelas Baru</h3>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px', marginBottom: '30px' }}>
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#94a3b8'}}>Nama Kelas</label>
                            <input 
                                type="text" className="form-control" 
                                placeholder="Contoh: X-RPL-1" required 
                                value={newName} onChange={e => setNewName(e.target.value)}
                                style={{ padding: '14px', fontSize: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#94a3b8'}}>Tingkat</label>
                            <select 
                                className="form-control" 
                                value={newGrade} onChange={e => setNewGrade(e.target.value)}
                                style={{ padding: '14px', fontSize: '1rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                            >
                                <option value="10">Kelas 10 (X)</option>
                                <option value="11">Kelas 11 (XI)</option>
                                <option value="12">Kelas 12 (XII)</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#94a3b8'}}>Tahun Ajaran</label>
                            <select 
                                className="form-control"
                                value={newYear} onChange={e => setNewYear(e.target.value)}
                                style={{ padding: '14px', fontSize: '1rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                            >
                                <option value="2024/2025">2024/2025</option>
                                <option value="2025/2026">2025/2026</option>
                                <option value="2026/2027">2026/2027</option>
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label font-bold text-xs mb-2 block uppercase tracking-wider" style={{color:'#94a3b8'}}>Wali Kelas</label>
                            <select 
                                className="form-control"
                                value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                                style={{ padding: '14px', fontSize: '1rem', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}
                            >
                                <option value="">-- Pilih Guru --</option>
                                {Array.isArray(teachers) && teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                         <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px', fontWeight: '600', borderRadius: '10px', boxShadow: 'none' }}>
                            Simpan Data
                        </button>
                    </div>
                </form>
            )}

            {/* CLASS TABLE */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minHeight: '300px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nama Kelas</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tingkat</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tahun Ajaran</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wali Kelas</th>
                            <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan="5" className="text-center p-10">
                                    <div className="flex-center flex-col py-10">
                                        <div className="spinner mb-3"></div>
                                        <p className="text-slate-500 font-bold">Memuat data kelas...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                             <tr>
                                <td colSpan="5" className="text-center p-10 text-red-500 font-bold">
                                    {error}
                                </td>
                            </tr>
                        ) : classes.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center p-5">
                                    <div style={{ fontSize: '3rem', marginBottom: '15px', color: '#cbd5e1' }}>📭</div>
                                    <p style={{ color: '#94a3b8', fontWeight: '500' }}>Belum ada data kelas yang dibuat.</p>
                                </td>
                            </tr>
                        ) : (
                            classes.map((cls, index) => (
                                <tr key={cls.id} className="hover:bg-slate-50 animate-fade-in" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', animationDelay: `${index * 50}ms` }}>
                                    <td style={{ padding: '20px', fontWeight: '600', color: '#334155' }}>
                                        {cls.name}
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{
                                            background: cls.grade_level === 10 ? '#dbeafe' : cls.grade_level === 11 ? '#fce7f3' : '#ffedd5',
                                            color: cls.grade_level === 10 ? '#1e40af' : cls.grade_level === 11 ? '#9d174d' : '#9a3412',
                                            padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                                            display: 'inline-block', minWidth: '40px', textAlign: 'center'
                                        }}>
                                            {getRomanGrade(cls.grade_level)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px', color: '#64748b', fontSize: '0.9rem' }}>{cls.academic_year}</td>
                                    <td style={{ padding: '20px' }}>
                                        {cls.wali_kelas_id ? (
                                            <div className="flex align-center gap-3">
                                                 <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:'bold', color:'#64748b'}}>
                                                    G
                                                 </div>
                                                 <span style={{color:'#475569', fontWeight:'500'}}>Guru #{cls.wali_kelas_id}</span>
                                            </div>
                                        ) : (
                                            <span style={{color:'#94a3b8', fontStyle:'italic', fontSize:'0.9rem'}}>-- Belum diset --</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'right' }}>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openManageModal(cls)}
                                                style={{
                                                    background: 'transparent', color: '#0ea5e9',
                                                    border: '1px solid #0ea5e9', padding: '8px 16px', borderRadius: '8px',
                                                    cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.target.style.background = '#e0f2fe'}
                                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                                            >
                                                👥 Anggota
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(cls.id)}
                                                style={{ 
                                                    background: 'transparent', color: '#ef4444', 
                                                    border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', 
                                                    cursor: 'pointer', fontSize: '0.9rem',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => {e.target.style.background = '#fee2e2'; e.target.style.borderColor = '#fca5a5'}}
                                                onMouseOut={(e) => {e.target.style.background = 'transparent'; e.target.style.borderColor = '#e2e8f0'}}
                                                title="Hapus Kelas"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                        
                        {/* ADD STUDENT FORM */}
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
