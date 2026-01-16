import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Schedules = () => {
    // Data State
    const [schedules, setSchedules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    
    // UI State
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formDay, setFormDay] = useState('Senin');
    const [formStartTime, setFormStartTime] = useState('07:00');
    const [formEndTime, setFormEndTime] = useState('08:30');
    const [formSubject, setFormSubject] = useState('');
    const [formTeacher, setFormTeacher] = useState('');

    // State tambahan untuk Edit
    // State tambahan untuk Edit
    const [editId, setEditId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // INFO USER LOGIN

    // ========== STATE UNTUK MATERI PELAJARAN (LMS) ==========
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [selectedScheduleForMaterial, setSelectedScheduleForMaterial] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    // Form upload materi
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialDesc, setMaterialDesc] = useState('');
    const [materialFile, setMaterialFile] = useState(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchSchedules(selectedClass);
        } else {
            setSchedules([]);
        }
    }, [selectedClass]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [resClasses, resSubjects, resTeachers, resProfile] = await Promise.all([
                axios.get('/classes/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/subjects/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/users/?role=teacher', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/myprofile', { headers: { Authorization: `Bearer ${token}` } }) // Cek Role
            ]);
            setClasses(resClasses.data);
            setSubjects(resSubjects.data);
            setTeachers(resTeachers.data);
            setCurrentUser(resProfile.data);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data awal.");
        }
    };

    const fetchSchedules = async (classId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/schedules/?class_id=${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSchedules(res.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat jadwal.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            const payload = {
                class_id: parseInt(selectedClass),
                subject_id: parseInt(formSubject),
                teacher_id: parseInt(formTeacher),
                day: formDay,
                start_time: formStartTime,
                end_time: formEndTime
            };

            if (editId) {
                // UPDATE
                await axios.put(`/schedules/${editId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert("Jadwal berhasil diperbarui!");
            } else {
                // CREATE
                await axios.post('/schedules/', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert("Jadwal berhasil ditambahkan!");
            }
            
            closeForm();
            fetchSchedules(selectedClass);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || "Gagal menyimpan jadwal.";
            alert(msg);
        }
    };

    const handleEdit = (sch) => {
        setEditId(sch.id);
        setFormDay(sch.day);
        setFormStartTime(sch.start_time);
        setFormEndTime(sch.end_time);
        setFormSubject(sch.subject_id);
        setFormTeacher(sch.teacher_id);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditId(null);
        // Reset default values (optional, or keep last used)
        setFormDay('Senin'); 
        setFormStartTime('07:00');
        setFormEndTime('08:30');
        setFormSubject('');
        setFormTeacher('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus jadwal ini?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/schedules/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSchedules(selectedClass);
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus jadwal.");
        }
    };

    // Helper to group schedules by day
    const getSchedulesByDay = (day) => schedules.filter(s => s.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));

    // ========== FUNGSI MATERI PELAJARAN ==========
    
    /**
     * Buka modal materi untuk jadwal tertentu.
     * Akan fetch list materi yang sudah diupload.
     */
    const openMaterialModal = async (schedule) => {
        setSelectedScheduleForMaterial(schedule);
        setShowMaterialModal(true);
        setLoadingMaterials(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/materials/?schedule_id=${schedule.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaterials(res.data);
        } catch (err) {
            console.error(err);
            alert('Gagal memuat daftar materi.');
        } finally {
            setLoadingMaterials(false);
        }
    };

    /**
     * Tutup modal dan reset semua state terkait materi.
     */
    const closeMaterialModal = () => {
        setShowMaterialModal(false);
        setSelectedScheduleForMaterial(null);
        setMaterials([]);
        setMaterialTitle('');
        setMaterialDesc('');
        setMaterialFile(null);
    };

    /**
     * Upload file materi ke backend.
     * Menggunakan FormData karena ada file upload.
     */
    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        if (!materialFile) {
            alert('Pilih file terlebih dahulu!');
            return;
        }
        
        setUploadingMaterial(true);
        const token = localStorage.getItem('token');
        
        // FormData untuk multipart upload
        const formData = new FormData();
        formData.append('title', materialTitle);
        formData.append('description', materialDesc);
        formData.append('file', materialFile);
        
        try {
            await axios.post(`/materials/upload/${selectedScheduleForMaterial.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            alert('Materi berhasil diupload!');
            
            // Reset form dan refresh list
            setMaterialTitle('');
            setMaterialDesc('');
            setMaterialFile(null);
            
            // Refresh materials list
            const res = await axios.get(`/materials/?schedule_id=${selectedScheduleForMaterial.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaterials(res.data);
            
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Gagal upload materi.';
            alert(msg);
        } finally {
            setUploadingMaterial(false);
        }
    };

    /**
     * Hapus materi dengan konfirmasi.
     */
    const handleDeleteMaterial = async (materialId) => {
        if (!window.confirm('Hapus materi ini?')) return;
        
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/materials/${materialId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh list
            setMaterials(materials.filter(m => m.id !== materialId));
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus materi.');
        }
    };

    /**
     * Format ukuran file dari bytes ke KB/MB.
     */
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="glass-card p-6 animate-fade-in" style={{ minHeight: '80vh', transition: 'height 0.3s ease' }}>
            {/* Header Section */}
            <div className="flex-between align-center mb-8">
                <div>
                     <h2 className="mb-1" style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>
                        Jadwal Pelajaran 🗓️
                     </h2>
                     <p className="text-muted m-0">Atur jadwal mingguan per kelas.</p>
                </div>
                {/* Action Button: Always Visible for better UX */}
                {/* Action Button: Only for Admin */}
                 {currentUser?.role === 'admin' && (
                     <button 
                        onClick={() => {
                            if (!selectedClass) {
                                alert("⚠️ Mohon pilih kelas terlebih dahulu sebelum menambah jadwal!");
                                return;
                            }
                            closeForm(); 
                            setShowForm(true);
                        }}
                        className={`btn-primary ${!selectedClass ? 'opacity-50' : ''}`}
                        title={!selectedClass ? "Pilih kelas dulu untuk aktifkan" : "Tambah Jadwal Baru"}
                        style={{ 
                            width: 'auto', 
                            padding: '10px 24px', 
                            background: '#4f46e5',
                            cursor: selectedClass ? 'pointer' : 'not-allowed'
                        }}
                     >
                        ➕ Tambah Jadwal
                     </button>
                 )}
            </div>

            {/* CLASS SELECTOR */}
            <div className="mb-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="w-full md:w-auto flex-1">
                    <label className="block text-xs font-bold mb-2 uppercase tracking-wide text-slate-500">Pilih Kelas</label>
                    <div className="form-input-wrapper" style={{maxWidth: '400px'}}>
                        <span className="form-input-icon">🏫</span>
                        <select 
                            className="form-control with-icon" 
                            value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                            style={{ fontSize: '1rem', cursor:'pointer' }}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} — {c.academic_year}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {selectedClass && (
                    <div className="text-right animate-fade-in">
                        <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Total Sesi</span>
                        <span className="text-xl font-bold text-slate-700">{schedules.length} Jam Pelajaran</span>
                    </div>
                )}
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3 animate-slide-down">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* SCHEDULE GRID */}
            <div style={{minHeight: '400px'}}>
                {selectedClass ? (
                    loading ? (
                        <div className="flex-center flex-col py-20 text-slate-400">
                            <div className="spinner mb-4"></div>
                            <p>Mengambil data jadwal...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            {days.map((day, index) => (
                                <div key={day} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all" 
                                     style={{animationDelay: `${index * 50}ms`}}>
                                    {/* Simple Header */}
                                    <div className="p-3 bg-slate-100 border-b border-slate-200 text-center font-bold text-slate-700 uppercase tracking-wide text-sm">
                                        {day}
                                    </div>
                                    
                                    <div className="p-4 min-h-[100px]">
                                        {getSchedulesByDay(day).length === 0 ? (
                                            <div className="text-center py-6">
                                                <p className="text-slate-400 text-xs italic m-0">Tidak ada jadwal</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {getSchedulesByDay(day).map(sch => (
                                                    <div key={sch.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 relative group hover:bg-white hover:border-indigo-200 transition-colors">
                                                        
                                                        {/* Time & Action */}
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                {sch.start_time} - {sch.end_time}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button 
                                                                    onClick={() => handleEdit(sch)}
                                                                    className="text-slate-300 hover:text-blue-500 transition-colors"
                                                                    title="Edit"
                                                                    /* Disable edit for non-admin on button click, better hidden though */
                                                                    style={{ display: currentUser?.role === 'admin' ? 'block' : 'none' }}
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(sch.id)}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                                    title="Hapus"
                                                                    style={{ display: currentUser?.role === 'admin' ? 'block' : 'none' }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Subject */}
                                                        <h4 className="text-sm font-bold text-slate-800 m-0 mb-1 leading-tight">
                                                            {sch.subject_name}
                                                        </h4>
                                                        
                                                        {/* Teacher */}
                                                        <p className="text-xs text-slate-500 m-0 flex items-center gap-1">
                                                            <span>👨‍🏫</span> {sch.teacher_name}
                                                        </p>
                                                        
                                                        {/* TOMBOL MATERI (NEW) */}
                                                        <button 
                                                            onClick={() => openMaterialModal(sch)}
                                                            className="mt-2 w-full text-xs py-1.5 px-3 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            📎 Materi
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-20 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500 text-lg">👈 Pilih kelas untuk melihat jadwal</p>
                    </div>
                )}
            </div>

            {/* CREATE/EDIT MODAL */}
            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-card animate-slide-down" style={{
                        width: '600px', background: 'white', padding: '32px', 
                        borderRadius: '24px', border: '1px solid #e2e8f0',
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div className="flex-between align-center mb-6">
                            <div>
                                <h3 className="m-0 text-xl font-bold text-slate-800">{editId ? 'Edit Jadwal' : 'Input Jadwal Bar'}</h3>
                                <p className="text-xs text-slate-500 m-0">Kelas: {classes.find(c => c.id == selectedClass)?.name}</p>
                            </div>
                            <button onClick={closeForm} 
                                className="hover:bg-slate-100 p-2 rounded-full transition-colors"
                                style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8', lineHeight:1}}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSaveSchedule}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Hari</label>
                                    <div className="form-input-wrapper">
                                        <span className="form-input-icon">📅</span>
                                        <select className="form-control with-icon" value={formDay} onChange={e => setFormDay(e.target.value)}>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Mata Pelajaran</label>
                                    <div className="form-input-wrapper">
                                        <span className="form-input-icon">📚</span>
                                        <select className="form-control with-icon" required value={formSubject} onChange={e => setFormSubject(e.target.value)}>
                                            <option value="">-- Pilih Mapel --</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Jam Mulai</label>
                                    <input type="time" className="form-control" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} required />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="form-label text-sm font-bold text-slate-700">Jam Selesai</label>
                                    <input type="time" className="form-control" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} required />
                                </div>
                                <div className="form-group md:col-span-2 mb-0">
                                     <label className="form-label text-sm font-bold text-slate-700">Guru Pengajar</label>
                                     <div className="form-input-wrapper">
                                        <span className="form-input-icon">👨‍🏫</span>
                                        <select className="form-control with-icon" required value={formTeacher} onChange={e => setFormTeacher(e.target.value)}>
                                            <option value="">-- Pilih Guru --</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                     </div>
                                </div>
                            </div>
                            
                            <div className="flex pt-4 border-t border-slate-100 gap-3">
                                <button type="button" onClick={closeForm} className="btn-secondary flex-1" style={{
                                     padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', 
                                     background: 'white', color: '#64748b', cursor:'pointer', fontWeight: 'bold'
                                 }}>Batal</button>
                                <button type="submit" className="btn-primary flex-1">{editId ? 'Simpan Perubahan' : 'Simpan Jadwal'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== MATERIAL MODAL (LMS) ========== */}
            {showMaterialModal && selectedScheduleForMaterial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-card animate-slide-down" style={{
                        width: '700px', maxWidth: '95vw', background: 'white', padding: '32px', 
                        borderRadius: '24px', border: '1px solid #e2e8f0',
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Header */}
                        <div className="flex-between align-center mb-6">
                            <div>
                                <h3 className="m-0 text-xl font-bold text-slate-800">📎 Materi Pelajaran</h3>
                                <p className="text-sm text-slate-500 m-0 mt-1">
                                    {selectedScheduleForMaterial.subject_name} — {selectedScheduleForMaterial.day}, {selectedScheduleForMaterial.start_time}
                                </p>
                            </div>
                            <button onClick={closeMaterialModal} 
                                className="hover:bg-slate-100 p-2 rounded-full transition-colors"
                                style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8', lineHeight:1}}>&times;</button>
                        </div>
                        
                        {/* DAFTAR MATERI YANG SUDAH DIUPLOAD */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">📂 File Tersedia</h4>
                            
                            {loadingMaterials ? (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="spinner mb-2"></div>
                                    <p className="m-0 text-sm">Memuat materi...</p>
                                </div>
                            ) : materials.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 m-0">Belum ada materi yang diupload.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {materials.map(mat => (
                                        <div key={mat.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors flex items-center justify-between gap-4">
                                            {/* File Info */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Icon berdasarkan tipe file */}
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg flex-shrink-0">
                                                    {mat.file_type === 'pdf' ? '📄' : 
                                                     ['mp4', 'webm', 'mov'].includes(mat.file_type) ? '🎬' :
                                                     ['jpg', 'jpeg', 'png', 'gif'].includes(mat.file_type) ? '🖼️' :
                                                     ['ppt', 'pptx'].includes(mat.file_type) ? '📊' :
                                                     ['doc', 'docx'].includes(mat.file_type) ? '📝' : '📁'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="text-sm font-bold text-slate-800 m-0 truncate">{mat.title}</h5>                                                    <p className="text-xs text-slate-500 m-0">
                                                        {mat.file_type.toUpperCase()} • {formatFileSize(mat.file_size)} • {mat.uploader_name}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex gap-2 flex-shrink-0">
                                                <a 
                                                    href={mat.file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                                                >
                                                    ⬇️ Download
                                                </a>
                                                <button 
                                                    onClick={() => handleDeleteMaterial(mat.id)}
                                                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* FORM UPLOAD MATERI BARU */}
                        <div className="pt-6 border-t border-slate-200">
                            <h4 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide">⬆️ Upload Materi Baru</h4>
                            
                            <form onSubmit={handleUploadMaterial}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="form-group mb-0">
                                        <label className="form-label text-sm font-bold text-slate-700">Judul Materi *</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="Contoh: Materi Bab 1 - Pengenalan"
                                            value={materialTitle}
                                            onChange={e => setMaterialTitle(e.target.value)}
                                            required
                                            maxLength={200}
                                        />
                                    </div>
                                    <div className="form-group mb-0">
                                        <label className="form-label text-sm font-bold text-slate-700">Pilih File *</label>
                                        <input 
                                            type="file" 
                                            className="form-control"
                                            onChange={e => setMaterialFile(e.target.files[0])}
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.mp3,.wav,.ogg"
                                        />
                                        <p className="text-xs text-slate-400 m-0 mt-1">Max 50MB. Format: PDF, DOC, PPT, Video, dll.</p>
                                    </div>
                                </div>
                                
                                <div className="form-group mb-4">
                                    <label className="form-label text-sm font-bold text-slate-700">Deskripsi (Opsional)</label>
                                    <textarea 
                                        className="form-control"
                                        placeholder="Penjelasan singkat tentang materi ini..."
                                        value={materialDesc}
                                        onChange={e => setMaterialDesc(e.target.value)}
                                        rows={2}
                                        maxLength={1000}
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    className="btn-primary w-full"
                                    disabled={uploadingMaterial || !materialTitle || !materialFile}
                                    style={{ opacity: (uploadingMaterial || !materialTitle || !materialFile) ? 0.6 : 1 }}
                                >
                                    {uploadingMaterial ? '⏳ Mengupload...' : '⬆️ Upload Materi'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedules;
