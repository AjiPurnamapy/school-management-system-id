import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Storage from './Storage';
import Classes from './Classes';
import Subjects from './Subjects';
import Schedules from './Schedules';

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
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 10;

    const navigate = useNavigate();

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
                alert("Catatan berhasil diupdate!");
            } else {
                // MODE CREATE
                await axios.post('/notes/', { title, content }, { headers: { Authorization: `Bearer ${token}` }});
                alert("Catatan berhasil dibuat!");
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
            alert(msg);
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
        if (!window.confirm("Yakin mau hapus catatan ini?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/notes/${noteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus.");
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
            alert("Foto Profil berhasil diupdate!");
        } catch (err) {
            console.error(err);
            alert("Gagal upload foto.");
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

    if (initialLoading) return <div style={{color:'#4f46e5', textAlign:'center', marginTop:'20vh', fontWeight:'bold', fontSize:'1.2rem'}}>Loading Data...</div>;

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
            <div className="glass-card dashboard-header">
                <div className="flex-center gap-4">
                    <div className="avatar-container">
                        <img 
                            src={user?.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
                            alt="Profile"
                            className="avatar-img"
                        />
                        <input type="file" id="fileInput" hidden accept="image/*" onChange={handleUploadPhoto} />
                        <label htmlFor="fileInput" className="avatar-edit-btn" title="Ganti Foto">📷</label>
                    </div>
                    <div>
                        <h1 className="mb-0 text-xl">Halo, {user?.name || 'User'}! 👋</h1>
                        <div className="flex-center gap-2 align-center justify-start">
                            <p className="text-muted mb-0">{user?.email}</p>
                            {user?.role && (
                                <span style={{ 
                                    background: user.role === 'student' ? '#eef2ff' : '#dcfce7', 
                                    color: user.role === 'student' ? '#4f46e5' : '#166534',
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight:'bold', textTransform:'uppercase'
                                }}>
                                    {user.role}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-primary" style={{ width: 'auto', background: '#dc3545', padding: '10px 20px' }}>Logout</button>
            </div>

            <div className="dashboard-content">
                
                {/* Kolom Kiri: Sidebar Menu ONLY */}
                <div className="glass-card dashboard-sidebar">
                    
                    {/* NAVIGATION MENU */}
                    <div className="nav-menu mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            onClick={() => setActiveTab('notes')}
                            className="btn-primary"
                            style={activeTab === 'notes' ? {} : {background:'transparent', color:'#4f46e5', border:'1px solid #4f46e5'}}
                        >
                            📝 My Notes
                        </button>
                        <button 
                            onClick={() => setActiveTab('storage')}
                            className="btn-primary"
                            style={activeTab === 'storage' ? {} : {background:'transparent', color:'#4f46e5', border:'1px solid #4f46e5'}}
                        >
                            ☁️ Cloud Storage
                        </button>
                        
                        {(user?.role === 'teacher' || user?.role === 'admin') && (
                            <>
                            <button 
                                onClick={() => setActiveTab('classes')}
                                className="btn-primary"
                                style={activeTab === 'classes' ? {} : {background:'transparent', color:'#4f46e5', border:'1px solid #4f46e5'}}
                            >
                                🏫 Classes
                            </button>
                            <button 
                                onClick={() => setActiveTab('subjects')}
                                className="btn-primary"
                                style={activeTab === 'subjects' ? {} : {background:'transparent', color:'#4f46e5', border:'1px solid #4f46e5'}}
                            >
                                📚 Subjects
                            </button>
                            <button 
                                onClick={() => setActiveTab('schedules')}
                                className="btn-primary"
                                style={activeTab === 'schedules' ? {} : {background:'transparent', color:'#4f46e5', border:'1px solid #4f46e5'}}
                            >
                                🗓️ Schedules
                            </button>
                            </>
                        )}
                    </div>

                    <hr className="mb-4" style={{borderTop: '1px solid #eee'}}/>
                     {activeTab === 'storage' && (
                        <div className="text-center text-muted">
                            <p>Simpan file penting Anda di sini.</p>
                            <small>Support: PDF, DOCX, JPG, PNG</small>
                        </div>
                    )}
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
                            <span style={{ background: '#eef2ff', padding: '5px 12px', borderRadius: '20px', color: '#4f46e5', fontWeight: 'bold', fontSize: '0.9rem' }}>
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
                            style={{ width: 'auto', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}
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
                            <div key={note.id} className="glass-card hover-card" style={{ padding: '25px', position: 'relative', transition: 'all 0.2s', borderLeft: '4px solid #4f46e5' }}>
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
                                style={{ width: 'auto', background: currentPage === 1 ? '#ccc' : '#4f46e5', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
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
                                style={{ width: 'auto', background: currentPage === totalPages ? '#ccc' : '#4f46e5', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
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
                                        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 30px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
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
                    ) : (
                        <Classes />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
