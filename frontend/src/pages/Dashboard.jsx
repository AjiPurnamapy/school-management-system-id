import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Storage from './Storage';
import Classes from './Classes';
import Subjects from './Subjects';
import Schedules from './Schedules';
import Assignments from './Assignments';
import Profile from './Profile';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import '../styles/DashboardTheme.css';

const Dashboard = () => {
    const [notes, setNotes] = useState([]);
    const [user, setUser] = useState(null); // Data user (nama, email, foto)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [editId, setEditId] = useState(null); // ID catatan yang sedang diedit
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null); // Add Error State
    
    // UI State
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'storage'
    const [showNoteForm, setShowNoteForm] = useState(false); // Modal visibility
    
    // Edit Profile State
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editNis, setEditNis] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 10;

    const navigate = useNavigate();
    const { toast } = useToast();
    const { confirm } = useConfirm();

    // Debounce Search Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset ke halaman 1 jika search berubah
        }, 500); 

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            setError(null); // Reset error sebelum fetch
            // OPTIMISASI: Gunakan Promise.all untuk request Parallel
            // Hitung Offset berdasarkan Current Page
            const offset = (currentPage - 1) * PAGE_SIZE;

            const params = { 
                sort_by: sortBy,
                offset: offset,
                limit: PAGE_SIZE
            };
            if (debouncedSearch) params.q = debouncedSearch;

            const [resNotes, resProfile] = await Promise.all([
                axios.get('/notes/', { 
                    headers: { Authorization: `Bearer ${token}` },
                    params: params
                }),
                axios.get('/myprofile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            // UPDATE: Backend sekarang mengembalikan { data: [...], total_items: ..., total_pages: ... }
            setNotes(resNotes.data.data); 
            setTotalPages(resNotes.data.total_pages);
            
            setUser(resProfile.data);

        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                handleLogout();
            } else {
                // Set error jika bukan auth error (misal backend mati)
                setError("Gagal menghubungi server. Pastikan Backend sudah berjalan.");
            }
        } finally {
            setInitialLoading(false);
        }
    };

    // Panggil fetchData saat komponen pertama kali dimuat
    // ATAU saat debouncedSearch / sortBy / currentPage berubah
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, sortBy, currentPage]);

    // Fungsi Submit (Create / Update)
    const handleSaveNote = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        try {
            if (editId) {
                // MODE UPDATE
                await axios.put(`/notes/${editId}`, { title, content }, { headers: { Authorization: `Bearer ${token}` }});
                toast.success("Catatan berhasil diupdate!");
            } else {
                // MODE CREATE
                await axios.post('/notes/', { title, content }, { headers: { Authorization: `Bearer ${token}` }});
                toast.success("Catatan berhasil dibuat!");
            }
            
            // Reset Form & Close Modal
            setTitle(''); 
            setContent('');
            setEditId(null);
            setShowNoteForm(false);
            
            // Refresh data
            fetchData(); 
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : "Gagal menyimpan catatan";
            toast.error(msg);
        }
    };

    const handleEdit = (note) => {
        setTitle(note.title);
        setContent(note.content);
        setEditId(note.id);
        setShowNoteForm(true); // Open Modal
    };

    const handleCancelEdit = () => {
        setTitle('');
        setContent('');
        setEditId(null);
        setShowNoteForm(false);
    };

    const handleDeleteNote = async (noteId) => {
        const confirmed = await confirm({
            title: 'Hapus Catatan',
            message: 'Yakin mau hapus catatan ini?',
            confirmText: 'Ya, Hapus',
            type: 'danger'
        });
        if (!confirmed) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/notes/${noteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Catatan berhasil dihapus!");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menghapus.");
        }
    };

    const handleUploadPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const token = localStorage.getItem('token');
        try {
            await axios.post('/upload-photo', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Refresh user profile
            fetchData(); // atau panggil endpoint profile saja
            toast.success("Foto Profil berhasil diupdate!");
        } catch (err) {
            console.error(err);
            toast.error("Gagal upload foto.");
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };
    
    // Open Edit Profile Modal - pre-fill dengan data user
    const openEditProfile = () => {
        setEditNis(user?.nis || '');
        setEditAddress(user?.address || '');
        setEditPhone(user?.phone || '');
        setEditBirthDate(user?.birth_date || '');
        setShowEditProfile(true);
    };
    
    // Handle Update Profile
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('/complete-profile', {
                nis: editNis,
                address: editAddress,
                phone: editPhone,
                birth_date: editBirthDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Update local user state
            setUser(prev => ({
                ...prev,
                nis: res.data.nis,
                address: res.data.address,
                phone: res.data.phone,
                birth_date: res.data.birth_date,
                is_profile_complete: true
            }));
            
            setShowEditProfile(false);
            toast.success('Profil berhasil diperbarui! 🎉');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.detail || 'Gagal memperbarui profil';
            toast.error(msg);
        }
    };

    if (initialLoading) return <div style={{color:'#22c55e', textAlign:'center', marginTop:'20vh', fontWeight:'bold', fontSize:'1.2rem'}}>Loading Data...</div>;

    if (error) {
        return (
            <div className="flex-center" style={{height:'100vh', flexDirection:'column', gap:'20px'}}>
                <div style={{fontSize:'3rem'}}>🔌</div>
                <h3>Koneksi Terputus</h3>
                <p className="text-muted">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary" style={{width:'auto', padding:'10px 30px'}}>
                    Coba Lagi
                </button>
                <div style={{marginTop:'20px'}}> 
                    <button onClick={handleLogout} className="btn-sm" style={{background:'transparent', border:'none', color:'#dc3545', cursor:'pointer', textDecoration:'underline'}}>
                        Logout / Kembali ke Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            {/* Simple Header with App Title */}
            <div className="glass-card dashboard-header" style={{ 
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎓</span>
                    <h1 style={{ 
                        margin: 0, 
                        fontSize: '1.25rem', 
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        School Management System
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                        fontSize: '0.85rem', 
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        👋 Selamat datang, <strong style={{ color: '#1e293b' }}>{user?.name}</strong>
                    </span>
                </div>
            </div>

            <div className="dashboard-content">
                
                {/* Kolom Kiri: Sidebar Menu dengan Profile Card */}
                <div className="glass-card dashboard-sidebar" style={{ padding: 0, overflow: 'hidden' }}>
                    
                    {/* PROFILE CARD SECTION */}
                    <div style={{ 
                        padding: '24px', 
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        borderBottom: '1px solid #bbf7d0'
                    }}>
                        {/* Profile Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative' }}>
                                <img 
                                    src={user?.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=22c55e&color=fff&size=128`} 
                                    alt="Profile"
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '3px solid white',
                                        boxShadow: '0 0 15px rgba(0,0,0,0.15)'
                                    }}
                                />
                                <input type="file" id="fileInput" hidden accept="image/*" onChange={handleUploadPhoto} />
                                <label 
                                    htmlFor="fileInput" 
                                    style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        right: '-2px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        border: '2px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        boxShadow: '0 0 10px rgba(0,0,0,0.15)'
                                    }}
                                    title="Ganti Foto"
                                >
                                    📷
                                </label>
                            </div>
                            
                            {/* Name & Email */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ 
                                    margin: 0, 
                                    fontSize: '1rem', 
                                    fontWeight: '700', 
                                    color: '#1e293b',
                                    marginBottom: '4px'
                                }}>
                                    {user?.name || 'User'}
                                </h3>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '0.8rem', 
                                    color: '#64748b'
                                }}>
                                    {user?.email}
                                </p>
                            </div>

                            {/* Edit Button */}
                            <button 
                                onClick={() => setActiveTab('profile')}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                ✏️
                            </button>
                        </div>

                        {/* Role Badge */}
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: '#16a34a',
                            textTransform: 'uppercase',
                            background: '#dcfce7',
                            padding: '4px 10px',
                            borderRadius: '12px'
                        }}>
                            {user?.role || 'User'}
                        </span>
                    </div>

                    {/* MENU LIST */}
                    <div style={{ padding: '12px' }}>
                        {[
                            { id: 'profile', icon: '👤', label: 'Profil Saya' },
                            { id: 'notes', icon: '📝', label: 'Catatan Saya' },
                            { id: 'storage', icon: '☁️', label: 'Cloud Storage' },
                            ...(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'student' ? [
                                { id: 'classes', icon: '🏫', label: 'Kelas' },
                                { id: 'subjects', icon: '📚', label: 'Mata Pelajaran' },
                                { id: 'schedules', icon: '🗓️', label: 'Jadwal Pelajaran' },
                                { id: 'assignments', icon: '📝', label: 'Tugas & PR' },
                            ] : [])
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    marginBottom: '4px',
                                    border: 'none',
                                    borderRadius: '12px',
                                    background: activeTab === item.id ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'transparent',
                                    color: activeTab === item.id ? 'white' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontSize: '0.95rem',
                                    fontWeight: activeTab === item.id ? '600' : '500',
                                    textAlign: 'left'
                                }}
                                onMouseOver={(e) => {
                                    if (activeTab !== item.id) {
                                        e.currentTarget.style.background = '#f0fdf4';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (activeTab !== item.id) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                <span>{item.label}</span>
                                {activeTab === item.id && (
                                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>›</span>
                                )}
                            </button>
                        ))}
                        
                        {/* Divider */}
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />
                        
                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 16px',
                                border: 'none',
                                borderRadius: '12px',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                textAlign: 'left'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>🚪</span>
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>

                {/* Kolom Kanan: Daftar Notes */}
                <div className="dashboard-main">
                    
                    {activeTab === 'notes' ? (
                        <>
                    
                     <div className="glass-card dashboard-toolbar mb-4">
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'white', padding: '0 15px', borderRadius: '12px', border: '1px solid #ddd' }}>
                            <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🔍</span>
                            <input type="text" placeholder="Cari catatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', padding: '12px 0', fontSize: '1rem' }} />
                        </div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '0.95rem' }}>
                            <option value="date_desc">📅 Terbaru</option>
                            <option value="date_asc">📆 Terlama</option>
                        </select>
                    </div>

                    <div className="flex-between mb-4 align-center">
                        <div className="flex align-center gap-3">
                            <h2 className="mb-0 text-2xl font-bold text-slate-800">Your Collection 📚</h2>
                            <span style={{ background: '#dcfce7', padding: '5px 12px', borderRadius: '20px', color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {notes.length} Notes
                            </span>
                        </div>
                        <button 
                            onClick={() => {
                                setEditId(null);
                                setTitle('');
                                setContent('');
                                setShowNoteForm(true);
                            }}
                            className="btn-primary animate-bounce-subtle"
                            style={{ width: 'auto', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
                        >
                            ➕ Tambah Catatan
                        </button>
                    </div>

                    <div className="dashboard-grid fade-in-up">
                        {notes.length === 0 && (
                            <div className="glass-card text-center p-10 opacity-80 col-span-full">
                                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📝</div>
                                <h3 className="text-xl text-slate-600 font-bold mb-2">Belum ada catatan</h3>
                                <p className="text-slate-400">Buat catatan pertamamu sekarang!</p>
                            </div>
                        )}
                        {notes.map((note) => (
                            <div key={note.id} className="glass-card hover-card" style={{ padding: '25px', position: 'relative', transition: 'all 0.2s', borderLeft: '4px solid #22c55e' }}>
                                <div className="flex-between align-start">
                                    <div style={{ marginRight: '10px', width: '100%' }}>
                                        <h3 className="mt-0 text-lg mb-1 font-bold text-slate-800 line-clamp-1">{note.title}</h3>
                                        {note.created_at && (
                                            <small className="text-muted flex align-center gap-1">
                                                🕒 {new Date(note.created_at + 'Z').toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                                            </small>
                                        )}
                                    </div>
                                    
                                    <div style={{ display:'flex', gap:'8px' }}>
                                        <button 
                                            onClick={() => handleEdit(note)}
                                            style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}
                                            className="hover:bg-slate-200"
                                            title="Edit Note"
                                        >✏️</button>
                                        <button 
                                            onClick={() => handleDeleteNote(note.id)}
                                            style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color: '#ef4444' }}
                                            className="hover:bg-red-100"
                                            title="Delete Note"
                                        >🗑️</button>
                                    </div>
                                </div>
                                <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.05)', margin: '15px 0' }}/>
                                <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', height: '60px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                    {note.content}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '40px' }}>
                            <button 
                                onClick={handlePrevPage} 
                                disabled={currentPage === 1}
                                className="btn-primary" 
                                style={{ width: 'auto', background: currentPage === 1 ? '#ccc' : '#22c55e', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                &lt; Prev
                            </button>
                            
                            <span style={{ fontWeight: 'bold', color: '#555' }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            
                            <button 
                                onClick={handleNextPage} 
                                disabled={currentPage === totalPages}
                                className="btn-primary" 
                                style={{ width: 'auto', background: currentPage === totalPages ? '#ccc' : '#22c55e', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next &gt;
                            </button>
                        </div>
                    )}

                    {/* MODAL FORM */}
                    {showNoteForm && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(15, 23, 42, 0.6)', 
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                             <div className="glass-card animate-slide-down" style={{ width: '600px', maxWidth: '90%', background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                                <div className="flex-between align-center mb-6">
                                    <h3 className="m-0 text-2xl font-bold text-slate-800">{editId ? '✏️ Edit Catatan' : '📝 Catatan Baru'}</h3>
                                    <button onClick={handleCancelEdit} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                                </div>
                                
                                <form onSubmit={handleSaveNote}>
                                    <div className="form-group mb-4">
                                        <label className="form-label font-bold text-slate-600 mb-2 block">Judul Catatan</label>
                                        <div className="form-input-wrapper">
                                            <input 
                                                type="text" className="form-control"
                                                value={title} onChange={(e) => setTitle(e.target.value)} 
                                                minLength={3} placeholder="Contoh: Ide Project Baru..." required 
                                                style={{ padding: '12px', fontSize: '1rem', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group mb-6">
                                        <label className="form-label font-bold text-slate-600 mb-2 block">Isi Catatan</label>
                                        <textarea 
                                            className="form-control" rows="8"
                                            value={content} onChange={(e) => setContent(e.target.value)} 
                                            minLength={4} placeholder="Tulis detail catatanmu di sini..." required 
                                            style={{ padding: '12px', fontSize: '1rem', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', resize: 'vertical' }}
                                        ></textarea>
                                    </div>
                                    
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={handleCancelEdit} className="btn-primary" style={{ background: '#f1f5f9', color: '#64748b', width: 'auto', padding: '12px 24px' }}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.2)' }}>
                                            {editId ? 'Update Catatan' : 'Simpan Catatan'}
                                        </button>
                                    </div>
                                </form>
                             </div>
                        </div>
                    )}
                        </>
                    ) : activeTab === 'storage' ? (
                        <Storage />
                    ) : activeTab === 'subjects' ? (
                        <Subjects />
                    ) : activeTab === 'schedules' ? (
                        <Schedules />
                    ) : activeTab === 'assignments' ? (
                        <Assignments />
                    ) : activeTab === 'profile' ? (
                        <Profile />
                    ) : (
                        <Classes />
                    )}
                </div>
            </div>
            
            {/* EDIT PROFILE MODAL */}
            {showEditProfile && (
                <div style={{
                    position: 'fixed', 
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div className="glass-card animate-slide-down" style={{
                        width: '100%',
                        maxWidth: '480px',
                        padding: '32px',
                        borderRadius: '24px',
                        background: 'white',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        {/* Modal Header */}
                        <div className="flex-between align-center mb-6">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
                                    ✏️ Edit Profil
                                </h3>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    Perbarui data diri Anda
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowEditProfile(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    lineHeight: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                                onMouseOut={(e) => e.target.style.background = 'none'}
                            >
                                ×
                            </button>
                        </div>
                        
                        {/* Edit Profile Form */}
                        <form onSubmit={handleUpdateProfile}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* NIS */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                                        {user?.role === 'teacher' ? 'NIP' : 'NIS'} <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editNis}
                                        onChange={(e) => setEditNis(e.target.value)}
                                        required
                                        minLength={5}
                                        maxLength={20}
                                        placeholder="Masukkan NIS/NIP"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                
                                {/* Alamat */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                                        Alamat <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <textarea
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        required
                                        minLength={10}
                                        maxLength={500}
                                        rows={2}
                                        placeholder="Masukkan alamat lengkap"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            resize: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                
                                {/* Nomor HP */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                                        Nomor HP <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        required
                                        minLength={10}
                                        maxLength={20}
                                        placeholder="Contoh: 081234567890"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                
                                {/* Tanggal Lahir */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                                        Tanggal Lahir <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={editBirthDate}
                                        onChange={(e) => setEditBirthDate(e.target.value)}
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                
                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditProfile(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            background: 'white',
                                            color: '#64748b',
                                            fontSize: '0.95rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: 'white',
                                            fontSize: '0.95rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        💾 Simpan
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
