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

    // Student's own submissions (for checkmark display)
    const [mySubmissions, setMySubmissions] = useState([]);
    
    // View Submission Modal (for student to see their own submission)
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingSubmission, setViewingSubmission] = useState(null);

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
            
            // Fetch student's own submissions (for checkmark display)
            if (resProfile.data.role === 'student') {
                try {
                    const resSubs = await axios.get('/submissions/my', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setMySubmissions(resSubs.data);
                } catch (e) {
                    console.warn("Failed to fetch my submissions:", e);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data awal");
        }
    };

    // Helper: Check if current student has submitted this assignment
    const getMySubmissionFor = (assignmentId) => {
        return mySubmissions.find(s => s.assignment_id === assignmentId);
    };

    // Open view modal for student's own submission
    const openViewSubmission = (submission) => {
        setViewingSubmission(submission);
        setShowViewModal(true);
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
                        {isCreating 
                            ? 'Isi detail tugas untuk siswa.' 
                            : (currentUser?.role === 'student' 
                                ? 'Lihat dan kerjakan tugas dari guru.' 
                                : 'Kelola tugas harian dan tenggat waktu.')}
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

            {/* CREATE ASSIGNMENT MODAL */}
            {isCreating && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '24px 28px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '24px', flexShrink: 0
                            }}>✨</div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    Buat Tugas Baru
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                    Isi detail tugas untuk siswa
                                </p>
                            </div>
                            <button 
                                onClick={() => { setIsCreating(false); resetForm(); }}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    border: 'none', background: '#f1f5f9', color: '#64748b',
                                    cursor: 'pointer', fontSize: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >✕</button>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleCreateAssignment} style={{ 
                            padding: '24px 28px', 
                            overflowY: 'auto', 
                            flex: 1 
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Judul */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                        Judul Tugas <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        required 
                                        placeholder="Contoh: Latihan Soal Matematika Bab 1"
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                                            border: '1px solid #e2e8f0', fontSize: '0.9rem',
                                            outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* Grid: Kelas & Mapel */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                            🏫 Kelas <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select 
                                            value={formClass} 
                                            onChange={e => setFormClass(e.target.value)} 
                                            required
                                            style={{
                                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                                border: '1px solid #e2e8f0', fontSize: '0.9rem',
                                                outline: 'none', background: 'white', boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="">Pilih Kelas</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                            📚 Mata Pelajaran <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select 
                                            value={formSubject} 
                                            onChange={e => setFormSubject(e.target.value)} 
                                            required
                                            style={{
                                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                                border: '1px solid #e2e8f0', fontSize: '0.9rem',
                                                outline: 'none', background: 'white', boxSizing: 'border-box'
                                            }}
                                        >
                                            <option value="">Pilih Mapel</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Grid: Deadline & File */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                            ⏰ Batas Waktu <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            required
                                            style={{
                                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                                border: '1px solid #e2e8f0', fontSize: '0.9rem',
                                                outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                            📎 Lampiran (Opsional)
                                        </label>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 16px', borderRadius: '12px',
                                            border: '1px dashed #cbd5e1', background: '#f8fafc',
                                            cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
                                        }}>
                                            <span>{file ? '✅' : '📄'}</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {file ? file.name : 'Pilih file...'}
                                            </span>
                                            <input 
                                                type="file" 
                                                style={{ display: 'none' }}
                                                onChange={e => setFile(e.target.files[0])} 
                                                accept=".pdf,.doc,.docx,.jpg,.png"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Deskripsi */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                        Deskripsi / Instruksi <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        required 
                                        placeholder="Tuliskan instruksi pengerjaan tugas secara detail di sini..."
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                                            border: '1px solid #e2e8f0', fontSize: '0.9rem',
                                            minHeight: '120px', resize: 'vertical',
                                            outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ 
                                display: 'flex', gap: '12px', marginTop: '24px', 
                                paddingTop: '20px', borderTop: '1px solid #e2e8f0' 
                            }}>
                                <button 
                                    type="button" 
                                    onClick={() => { setIsCreating(false); resetForm(); }}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#64748b', fontWeight: '600', fontSize: '0.9rem',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    ❌ Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        border: 'none', 
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        color: 'white', fontWeight: '600', fontSize: '0.9rem',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                                        opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? '⏳ Menyimpan...' : '💾 Simpan Tugas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            {!isCreating && (
                <>

            {/* Filter */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center">
                {/* Class Filter - Static for Students, Dropdown for Teachers/Admin */}
                {currentUser?.role === 'student' ? (
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-xl">🏫</span>
                            <div>
                                <p className="text-xs text-slate-400 m-0 font-medium">Kelas Saya</p>
                                <p className="text-sm font-bold text-slate-700 m-0">
                                    {classes.find(c => c.id === currentUser?.class_id)?.name || 'Belum terdaftar di kelas'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
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
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {assignments.map((tugas, index) => (
                        <div 
                            key={tugas.id} 
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid #e2e8f0',
                                borderLeft: '4px solid #22c55e',
                                boxShadow: '0 0 20px rgba(0,0,0,0.03)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                animationDelay: `${index * 50}ms`
                            }}
                            className="hover:shadow-lg hover:-translate-y-1 hover:border-green-200 animate-fade-in"
                        >
                            {/* HEADER: Title (Left) & Actions/Download (Right) */}
                            <div className="flex justify-between items-start">
                                <div style={{ flex: 1, paddingRight: '10px' }}>
                                    <h4 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        margin: 0,
                                        marginBottom: '8px',
                                        lineHeight: '1.3'
                                    }}>
                                        {tugas.title}
                                    </h4>
                                    
                                    {/* Class & Subject Badges - directly below title */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            color: '#22c55e',
                                            background: '#dcfce7',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            🏫 {tugas.class_name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            color: '#3b82f6',
                                            background: '#dbeafe',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            📚 {tugas.subject_name}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Delete Button & File Link */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    {isTeacherOrAdmin && (
                                        <button 
                                            onClick={() => handleDelete(tugas.id)}
                                            title="Hapus Tugas"
                                            style={{ 
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                border: 'none', background: '#fee2e2', color: '#ef4444',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s', fontSize: '16px'
                                            }}
                                            onMouseOver={(e) => {e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color='white';}}
                                            onMouseOut={(e) => {e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color='#ef4444';}}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                    {tugas.file_url && (
                                        <a href={tugas.file_url} target="_blank" rel="noopener noreferrer" 
                                            style={{ 
                                                fontSize: '0.75rem', 
                                                color: '#3b82f6', 
                                                textDecoration: 'none', 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '4px',
                                                background: '#eff6ff',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: '500'
                                            }}
                                            className="hover:underline"
                                        >
                                            📎 Lampiran
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* BODY: Description & Info */}
                            <div className="flex flex-col gap-3">
                                {/* Description */}
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }} className="line-clamp-2">
                                    {tugas.description}
                                </p>

                                {/* Teacher (Left) & Deadline (Right) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    {/* Teacher */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%', background: '#e0f2fe',
                                            color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                        }}>👨‍🏫</div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>{tugas.teacher_name}</span>
                                    </div>
                                    
                                    {/* Deadline */}
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#ef4444',
                                        background: '#fef2f2',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        📅 {new Date(tugas.due_date + 'Z').toLocaleString('id-ID', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                            
                            {/* FOOTER: Action Button */}
                            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                                {isTeacherOrAdmin ? (
                                    <button 
                                        onClick={() => openGradingModal(tugas)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'white',
                                            border: '1px solid #22c55e',
                                            color: '#22c55e',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#22c55e';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.25)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#22c55e';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <span>📋</span> Lihat Pengumpulan
                                    </button>
                                ) : (
                                    (() => {
                                        const mySubmission = getMySubmissionFor(tugas.id);
                                        if (mySubmission) {
                                            // Already submitted - show checkmark + view button
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                        padding: '10px', background: '#dcfce7', borderRadius: '10px',
                                                        color: '#16a34a', fontWeight: '600', fontSize: '0.85rem'
                                                    }}>
                                                        <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                        Sudah Dikumpulkan
                                                        {mySubmission.grade !== null && (
                                                            <span style={{
                                                                background: mySubmission.grade >= 75 ? '#22c55e' : '#f59e0b',
                                                                color: 'white', padding: '2px 8px', borderRadius: '6px',
                                                                fontSize: '0.75rem', fontWeight: '700', marginLeft: '4px'
                                                            }}>Nilai: {mySubmission.grade}</span>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => openViewSubmission(mySubmission)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            borderRadius: '10px',
                                                            background: 'white',
                                                            border: '1px solid #94a3b8',
                                                            color: '#475569',
                                                            fontWeight: '600',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = '#f1f5f9';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'white';
                                                        }}
                                                    >
                                                        <span>👀</span> Lihat Jawaban Saya
                                                    </button>
                                                </div>
                                            );
                                        } else {
                                            // Not submitted yet - show upload button
                                            return (
                                                <button 
                                                    onClick={() => openSubmitModal(tugas)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        borderRadius: '12px',
                                                        background: 'white',
                                                        border: '1px solid #3b82f6',
                                                        color: '#3b82f6',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = '#3b82f6';
                                                        e.currentTarget.style.color = 'white';
                                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.25)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.color = '#3b82f6';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <span>📤</span> Upload Jawaban
                                                </button>
                                            );
                                        }
                                    })()
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
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ 
                                width: '60px', height: '60px', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '28px'
                            }}>📤</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                Kumpulkan Tugas
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>
                                {selectedTask.title}
                            </p>
                        </div>
                        
                        <form onSubmit={handleSubmitAssignment}>
                            {/* Upload Area */}
                            <div style={{
                                border: '2px dashed #cbd5e1',
                                borderRadius: '16px',
                                padding: '32px 24px',
                                textAlign: 'center',
                                background: '#f8fafc',
                                marginBottom: '24px',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
                                <p style={{ fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                                    Upload File Jawaban
                                </p>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '16px' }}>
                                    PDF, DOC, DOCX, JPG, PNG (Max 20MB)
                                </p>
                                <input 
                                    type="file" 
                                    onChange={e => setSubmissionFile(e.target.files[0])}
                                    required
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        fontSize: '0.875rem',
                                        color: '#64748b'
                                    }}
                                />
                                {submissionFile && (
                                    <p style={{ 
                                        marginTop: '12px', 
                                        fontSize: '0.875rem', 
                                        color: '#22c55e',
                                        fontWeight: '600'
                                    }}>
                                        ✅ {submissionFile.name}
                                    </p>
                                )}
                            </div>
                            
                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowSubmitModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#64748b',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={uploading}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        color: 'white',
                                        fontWeight: '600',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        boxShadow: uploading ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.35)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {uploading ? '⏳ Mengirim...' : '🚀 Kirim Jawaban'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {showGradingModal && selectedTask && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '85vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '20px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ 
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '24px'
                                }}>📋</div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                        Daftar Pengumpulan
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
                                        {selectedTask.title} — {selectedTask.class_name}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowGradingModal(false)}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    border: 'none', background: '#f1f5f9', color: '#64748b',
                                    fontSize: '20px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >×</button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                            {loadingSubmissions ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="spinner"></div>
                                </div>
                            ) : submissions.length === 0 ? (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '48px 24px', 
                                    background: '#f8fafc', 
                                    borderRadius: '16px',
                                    border: '2px dashed #e2e8f0'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                                    <p style={{ color: '#94a3b8', fontWeight: '500' }}>
                                        Belum ada siswa yang mengumpulkan.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ 
                                    background: '#f8fafc', 
                                    borderRadius: '12px', 
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9' }}>
                                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Siswa</th>
                                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waktu Submit</th>
                                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>File</th>
                                                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nilai</th>
                                                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map((sub, idx) => (
                                                <tr key={sub.id} style={{ 
                                                    background: idx % 2 === 0 ? 'white' : '#fafafa',
                                                    borderBottom: '1px solid #f1f5f9'
                                                }}>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{
                                                                width: '32px', height: '32px', borderRadius: '8px',
                                                                background: '#dbeafe', color: '#3b82f6',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '14px', fontWeight: '600'
                                                            }}>
                                                                {sub.student_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{sub.student_name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.875rem' }}>
                                                        {new Date(sub.submitted_at + 'Z').toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <a 
                                                            href={sub.file_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                padding: '6px 12px', borderRadius: '8px',
                                                                background: '#eff6ff', color: '#3b82f6',
                                                                fontSize: '0.875rem', fontWeight: '500',
                                                                textDecoration: 'none'
                                                            }}
                                                        >📄 Lihat</a>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                        {sub.grade !== null ? (
                                                            <span style={{
                                                                padding: '6px 12px', borderRadius: '8px',
                                                                fontWeight: '700', fontSize: '0.875rem',
                                                                background: sub.grade >= 75 ? '#dcfce7' : '#fef3c7',
                                                                color: sub.grade >= 75 ? '#16a34a' : '#d97706'
                                                            }}>{sub.grade}</span>
                                                        ) : (
                                                            <span style={{ color: '#cbd5e1' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right', position: 'relative' }}>
                                                        {gradingId === sub.id ? (
                                                            <div style={{
                                                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                                                background: 'white', padding: '16px', borderRadius: '12px',
                                                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
                                                                minWidth: '200px', zIndex: 10
                                                            }}>
                                                            <form onSubmit={(e) => { e.preventDefault(); handleGrade(sub.id); }}>
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Nilai (0-100)" 
                                                                    value={gradeValue} 
                                                                    onChange={e => setGradeValue(e.target.value)}
                                                                    min="0" max="100"
                                                                    autoFocus
                                                                    style={{
                                                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                                        border: '1px solid #e2e8f0', fontSize: '0.875rem',
                                                                        marginBottom: '8px'
                                                                    }}
                                                                />
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Feedback (opsional)" 
                                                                    value={feedbackValue} 
                                                                    onChange={e => setFeedbackValue(e.target.value)}
                                                                    style={{
                                                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                                                        border: '1px solid #e2e8f0', fontSize: '0.875rem',
                                                                        marginBottom: '12px'
                                                                    }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setGradingId(null)}
                                                                        style={{
                                                                            padding: '8px 14px', borderRadius: '8px',
                                                                            border: '1px solid #e2e8f0', background: 'white',
                                                                            color: '#64748b', fontSize: '0.8rem', fontWeight: '600',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >Batal</button>
                                                                    <button 
                                                                        type="submit"
                                                                        style={{
                                                                            padding: '8px 14px', borderRadius: '8px',
                                                                            border: 'none', background: '#22c55e',
                                                                            color: 'white', fontSize: '0.8rem', fontWeight: '600',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >Simpan</button>
                                                                </div>
                                                            </form>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => {
                                                                    setGradingId(sub.id);
                                                                    setGradeValue(sub.grade || '');
                                                                    setFeedbackValue(sub.feedback || '');
                                                                }}
                                                                style={{
                                                                    padding: '8px 16px', borderRadius: '8px',
                                                                    border: 'none', 
                                                                    background: sub.grade ? '#f1f5f9' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                                    color: sub.grade ? '#475569' : 'white',
                                                                    fontSize: '0.8rem', fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    boxShadow: sub.grade ? 'none' : '0 2px 8px rgba(34, 197, 94, 0.3)'
                                                                }}
                                                            >
                                                                {sub.grade ? '✏️ Edit' : '⭐ Beri Nilai'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* View My Submission Modal (Student) */}
            {showViewModal && viewingSubmission && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ 
                                width: '60px', height: '60px', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '28px'
                            }}>✅</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                Jawaban Terkirim
                            </h3>
                        </div>
                        
                        {/* Submission Details */}
                        <div style={{ 
                            background: '#f8fafc', 
                            borderRadius: '12px', 
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                                    Waktu Kirim
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500', margin: 0 }}>
                                    {new Date(viewingSubmission.submitted_at + 'Z').toLocaleString('id-ID')}
                                </p>
                            </div>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                                    File Jawaban
                                </p>
                                <a 
                                    href={viewingSubmission.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 16px', borderRadius: '10px',
                                        background: '#eff6ff', color: '#3b82f6',
                                        fontSize: '0.9rem', fontWeight: '600',
                                        textDecoration: 'none'
                                    }}
                                >📄 Lihat/Download File</a>
                            </div>
                            
                            {viewingSubmission.grade !== null && (
                                <div style={{ marginBottom: '16px' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                                        Nilai
                                    </p>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '8px 16px', borderRadius: '10px',
                                        background: viewingSubmission.grade >= 75 ? '#dcfce7' : '#fef3c7',
                                        color: viewingSubmission.grade >= 75 ? '#16a34a' : '#d97706',
                                        fontSize: '1.5rem', fontWeight: '700'
                                    }}>{viewingSubmission.grade}</span>
                                </div>
                            )}
                            
                            {viewingSubmission.feedback && (
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
                                        Feedback Guru
                                    </p>
                                    <p style={{ 
                                        fontSize: '0.9rem', color: '#475569', margin: 0,
                                        background: 'white', padding: '12px', borderRadius: '8px',
                                        border: '1px solid #e2e8f0', lineHeight: '1.5'
                                    }}>
                                        {viewingSubmission.feedback}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setShowViewModal(false)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#f1f5f9',
                                color: '#475569',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignments;
