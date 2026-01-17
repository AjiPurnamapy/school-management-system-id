import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

const Assignments = () => {
    // Data State
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Filter State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Form State (Create Assignment)
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [formClass, setFormClass] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Submission State (Student Upload)
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [submissionFile, setSubmissionFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Grading State (Teacher View)
    const [showGradingModal, setShowGradingModal] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [gradingId, setGradingId] = useState(null); // ID Submission yg sedang dinilai
    const [gradeValue, setGradeValue] = useState('');
    const [feedbackValue, setFeedbackValue] = useState('');

    const { toast } = useToast();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchAssignments();
    }, [selectedClass, selectedSubject]);

    const fetchInitialData = async () => {
        const token = localStorage.getItem('token');
        try {
            const [resClasses, resSubjects, resProfile] = await Promise.all([
                axios.get('/classes/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/subjects/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/myprofile', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setClasses(resClasses.data);
            setSubjects(resSubjects.data);
            setCurrentUser(resProfile.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data awal");
        }
    };

    const fetchAssignments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const params = {};
            if (selectedClass) params.class_id = selectedClass;
            if (selectedSubject) params.subject_id = selectedSubject;

            const res = await axios.get('/assignments/', { 
                headers: { Authorization: `Bearer ${token}` },
                params: params
            });
            setAssignments(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat daftar tugas");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('due_date', dueDate);
        formData.append('class_id', formClass);
        formData.append('subject_id', formSubject);
        if (file) {
            formData.append('file', file);
        }

        try {
            await axios.post('/assignments/', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Tugas berhasil dibuat!");
            setIsCreating(false);
            resetForm();
            fetchAssignments();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal membuat tugas");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Hapus Tugas',
            message: 'Yakin hapus tugas ini? Semua pengumpulan siswa juga akan terhapus.',
            confirmText: 'Ya, Hapus',
            type: 'danger'
        });
        if (!confirmed) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/assignments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Tugas berhasil dihapus");
            fetchAssignments();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menghapus tugas");
        }
    };

    // STUDENT: Open Submission Modal
    const openSubmitModal = (task) => {
        setSelectedTask(task);
        setSubmissionFile(null);
        setShowSubmitModal(true);
    };

    // STUDENT: Submit Handler
    const handleSubmitAssignment = async (e) => {
        e.preventDefault();
        if (!submissionFile) return toast.warning("Pilih file jawaban dulu!");

        setUploading(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', submissionFile);

        try {
            await axios.post(`/submissions/upload/${selectedTask.id}`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Tugas berhasil dikumpulkan! 🎉");
            setShowSubmitModal(false);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Gagal mengumpulkan tugas");
        } finally {
            setUploading(false);
        }
    };

    // TEACHER: Open Grading Modal
    const openGradingModal = async (task) => {
        setSelectedTask(task);
        setShowGradingModal(true);
        setLoadingSubmissions(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`/submissions/assignment/${task.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat pengumpulan siswa");
        } finally {
            setLoadingSubmissions(false);
        }
    };

    // TEACHER: Submit Grade
    const handleGrade = async (submissionId) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`/submissions/${submissionId}/grade`, {
                grade: parseInt(gradeValue),
                feedback: feedbackValue
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Nilai berhasil disimpan!");
            setGradingId(null);
            // Refresh submissions
            const res = await axios.get(`/submissions/assignment/${selectedTask.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal menyimpan nilai");
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setFormClass('');
        setFormSubject('');
        setFile(null);
    };

    const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'principal';

    return (
        <div className="glass-card p-6 animate-fade-in" style={{ minHeight: '80vh' }}>
            {/* Header */}
            <div className="flex-between align-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                        {isCreating ? '✨ Buat Tugas Baru' : 'Tugas & PR 📝'}
                    </h2>
                    <p className="text-slate-500 m-0">
                        {isCreating ? 'Isi detail tugas untuk siswa.' : 'Kelola tugas harian dan tenggat waktu.'}
                    </p>
                </div>
                {isTeacherOrAdmin && !isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '10px 24px', borderRadius: '12px' }}
                    >
                        ➕ Buat Tugas Baru
                    </button>
                )}
            </div>

            {/* CREATE FORM - INLINE */}
            {isCreating ? (
                <div className="animate-fade-in bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <form onSubmit={handleCreateAssignment}>
                        <div className="space-y-5">
                            {/* Judul */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Judul Tugas <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="form-control w-full px-4 py-2.5 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white h-[46px]" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    required 
                                    placeholder="Contoh: Latihan Soal Matematika Bab 1" 
                                />
                            </div>
                            
                            {/* Grid 1: Kelas & Mapel */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Kelas <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🏫</span>
                                        <select 
                                            className="form-control w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 appearance-none bg-white h-[46px]" 
                                            value={formClass} 
                                            onChange={e => setFormClass(e.target.value)} 
                                            required
                                        >
                                            <option value="">Pilih Kelas</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Mata Pelajaran <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">📚</span>
                                        <select 
                                            className="form-control w-full pl-10 pr-4 py-2.5 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 appearance-none bg-white h-[46px]" 
                                            value={formSubject} 
                                            onChange={e => setFormSubject(e.target.value)} 
                                            required
                                        >
                                            <option value="">Pilih Mapel</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
                                    </div>
                                </div>
                            </div>

                                    {/* Grid 2: Deadline & File */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Batas Waktu (Deadline) <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                type="datetime-local" 
                                                className="form-control w-full px-4 py-2.5 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-slate-600 bg-white h-[46px]" 
                                                value={dueDate} 
                                                onChange={e => setDueDate(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Lampiran (Opsional)
                                            </label>
                                            <label className="flex items-center gap-3 px-3 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all bg-white w-full h-[46px] group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <span className="text-xl relative z-10 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-blue-500">📎</span>
                                                <span className="text-sm text-slate-500 group-hover:text-blue-600 font-medium truncate flex-1 relative z-10">
                                                    {file ? file.name : "Upload Materi..."}
                                                </span>
                                                <span className="text-xs font-bold bg-slate-100 group-hover:bg-blue-500 text-slate-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm relative z-10">
                                                    Browse File
                                                </span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    onChange={e => setFile(e.target.files[0])} 
                                                    accept=".pdf,.doc,.docx,.jpg,.png" 
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Deskripsi */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Deskripsi / Instruksi <span className="text-red-500">*</span>
                                        </label>
                                        <textarea 
                                            className="form-control w-full px-4 py-3 h-32 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none bg-white" 
                                            value={description} 
                                            onChange={e => setDescription(e.target.value)} 
                                            required 
                                            placeholder="Tuliskan instruksi pengerjaan tugas secara detail di sini..."
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreating(false)} 
                                        className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-500 bg-white border-2 border-slate-100 hover:border-red-100 hover:bg-red-50 hover:text-red-500 transition-all flex justify-center items-center gap-2"
                                    >
                                        <span>❌</span> Batal
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all transform flex justify-center items-center gap-2"
                                    >
                                        <span>💾</span> Simpan Tugas
                                    </button>
                                </div>
                    </form>
                </div>
            ) : (
                <>

            {/* Filter */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="form-input-wrapper flex-1 min-w-[200px]">
                    <span className="form-input-icon">🏫</span>
                    <select 
                        className="form-control with-icon"
                        value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    >
                        <option value="">-- Semua Kelas --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-input-wrapper flex-1 min-w-[200px]">
                    <span className="form-input-icon">📘</span>
                    <select 
                        className="form-control with-icon"
                        value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                    >
                        <option value="">-- Semua Mapel --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* List Assignments */}
            {loading ? (
                 <div className="text-center py-10"><div className="spinner"></div></div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-20 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-500 text-lg">📭 Belum ada tugas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assignments.map(tugas => (
                        <div key={tugas.id} className="glass-card p-5 border-l-4 border-l-emerald-500 hover:shadow-lg transition-all relative">
                             {isTeacherOrAdmin && (
                                <button 
                                    onClick={() => handleDelete(tugas.id)}
                                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1"
                                    title="Hapus Tugas"
                                >
                                    🗑️
                                </button>
                             )}
                            
                            <div className="flex gap-2 mb-2">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{tugas.class_name}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{tugas.subject_name}</span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{tugas.title}</h3>
                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{tugas.description}</p>
                            
                            {/* File Link */}
                            {tugas.file_url && (
                                <a href={tugas.file_url} target="_blank" rel="noopener noreferrer" className="block mb-4 text-sm text-blue-600 hover:underline">
                                    📎 Download Soal / Lampiran
                                </a>
                            )}
                            
                            <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3 mt-auto">
                                <div className="flex items-center gap-1">
                                    <span>📅 Deadline:</span>
                                    <span className="font-bold text-red-500">
                                        {new Date(tugas.due_date + 'Z').toLocaleString('id-ID', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>👨‍🏫 {tugas.teacher_name}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-2">
                                {isTeacherOrAdmin ? (
                                    <button 
                                        onClick={() => openGradingModal(tugas)}
                                        className="w-full btn-primary text-sm py-2"
                                    >
                                        👀 Lihat Pengumpulan
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => openSubmitModal(tugas)}
                                        className="w-full btn-primary text-sm py-2"
                                        style={{ background: '#3b82f6', boxShadow:'0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}
                                    >
                                        📤 Upload Jawaban
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

                </>
            )}

            {/* Submission Modal */}
            {showSubmitModal && selectedTask && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="glass-card w-[500px] max-w-[95%] bg-white p-8 rounded-2xl shadow-2xl animate-slide-down">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Kumpulkan Tugas</h3>
                            <p className="text-slate-500 text-sm mt-1">{selectedTask.title}</p>
                        </div>
                        
                        <form onSubmit={handleSubmitAssignment}>
                            <div className="mb-6 p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-white hover:border-blue-400 transition-colors">
                                <div className="text-4xl mb-2">📁</div>
                                <p className="text-sm font-bold text-slate-600 mb-2">Upload File Jawaban</p>
                                <p className="text-xs text-slate-400 mb-4">PDF, DOCT, JPG (Max 20MB)</p>
                                <input 
                                    type="file" 
                                    className="block w-full text-sm text-slate-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-blue-50 file:text-blue-700
                                      hover:file:bg-blue-100" 
                                    onChange={e => setSubmissionFile(e.target.files[0])}
                                    required
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowSubmitModal(false)} className="btn-secondary flex-1 py-3">Batal</button>
                                <button type="submit" className="btn-primary flex-1 py-3" disabled={uploading}>
                                    {uploading ? '⏳ Mengirim...' : '🚀 Kirim Jawaban'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {showGradingModal && selectedTask && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="glass-card w-[800px] max-w-[95%] bg-white p-6 rounded-2xl shadow-2xl animate-slide-down max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Daftar Pengumpulan</h3>
                                <p className="text-slate-500 text-sm mt-1">{selectedTask.title} — {selectedTask.class_name}</p>
                            </div>
                            <button onClick={() => setShowGradingModal(false)} className="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {loadingSubmissions ? (
                                <div className="text-center py-10"><div className="spinner"></div></div>
                            ) : submissions.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed text-slate-400">
                                    Belum ada siswa yang mengumpulkan.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide sticky top-0">
                                        <tr>
                                            <th className="p-3 border-b">Nama Siswa</th>
                                            <th className="p-3 border-b">Waktu Submit</th>
                                            <th className="p-3 border-b">File</th>
                                            <th className="p-3 border-b text-center">Nilai</th>
                                            <th className="p-3 border-b text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {submissions.map(sub => (
                                            <tr key={sub.id} className="border-b hover:bg-slate-50">
                                                <td className="p-3 font-semibold text-slate-700">{sub.student_name}</td>
                                                <td className="p-3 text-slate-500">
                                                    {new Date(sub.submitted_at + 'Z').toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-3">
                                                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                        📄 Lihat
                                                    </a>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {sub.grade !== null ? (
                                                        <span className={`px-2 py-1 rounded font-bold ${sub.grade >= 75 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {sub.grade}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {gradingId === sub.id ? (
                                                        <div className="flex flex-col gap-2 min-w-[150px] bg-white p-2 shadow rounded absolute right-10 z-10 border border-slate-200 animate-fade-in">
                                                            <input 
                                                                type="number" className="form-control text-sm p-1" 
                                                                placeholder="Nilai (0-100)" 
                                                                value={gradeValue} onChange={e => setGradeValue(e.target.value)}
                                                                min="0" max="100"
                                                            />
                                                            <input 
                                                                type="text" className="form-control text-sm p-1" 
                                                                placeholder="Feedback..." 
                                                                value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)}
                                                            />
                                                            <div className="flex gap-1 justify-end">
                                                                <button onClick={() => setGradingId(null)} className="text-xs bg-slate-100 px-2 py-1 rounded">Batal</button>
                                                                <button onClick={() => handleGrade(sub.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Simpan</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setGradingId(sub.id);
                                                                setGradeValue(sub.grade || '');
                                                                setFeedbackValue(sub.feedback || '');
                                                            }}
                                                            className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded hover:bg-slate-300 transition-colors"
                                                        >
                                                            {sub.grade ? 'Edit Nilai' : 'Beri Nilai'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignments;
