import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
            }
            
            // Reset Form
            setTitle(''); 
            setContent('');
            setEditId(null);
            
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
        // Scroll ke atas (opsional) agar user sadar form sudah terisi
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setTitle('');
        setContent('');
        setEditId(null);
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
                        <p className="text-muted mb-0">{user?.email}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-primary" style={{ width: 'auto', background: '#dc3545', padding: '10px 20px' }}>Logout</button>
            </div>

            <div className="dashboard-content">
                
                {/* Kolom Kiri: Form Buat/Edit Note */}
                <div className="glass-card dashboard-sidebar">
                    <h3 className="mt-0">{editId ? '✏️ Edit Note' : '+ New Note'}</h3>
                    <p className="text-muted text-sm mb-4">
                        {editId ? 'Silahkan edit catatan Anda.' : 'Tulis idemu di sini agar tidak lupa.'}
                    </p>
                    <form onSubmit={handleSaveNote}>
                        <div className="form-group">
                            <label className="form-label">
                                Title <small className="text-muted font-normal">(min. 3 chars)</small>
                            </label>
                            <input 
                                type="text" className="form-control"
                                value={title} onChange={(e) => setTitle(e.target.value)} 
                                minLength={3} placeholder="Judul catatan..." required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Content <small className="text-muted font-normal">(min. 4 chars)</small>
                            </label>
                            <textarea 
                                className="form-control" rows="8"
                                value={content} onChange={(e) => setContent(e.target.value)} 
                                minLength={4} placeholder="Isi catatan..." required 
                            ></textarea>
                        </div>
                        
                        <div className="flex-between gap-2">
                            {editId && (
                                <button type="button" onClick={handleCancelEdit} className="btn-primary" style={{ background: '#6c757d' }}>
                                    Cancel
                                </button>
                            )}
                            <button type="submit" className="btn-primary">
                                {editId ? 'Update Note' : 'Save Note'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Kolom Kanan: Daftar Notes */}
                <div className="dashboard-main">
                    
                     <div className="glass-card dashboard-toolbar">
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'white', padding: '0 15px', borderRadius: '12px', border: '1px solid #ddd' }}>
                            <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🔍</span>
                            <input type="text" placeholder="Cari catatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', padding: '12px 0', fontSize: '1rem' }} />
                        </div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '0.95rem' }}>
                            <option value="date_desc">📅 Terbaru</option>
                            <option value="date_asc">📆 Terlama</option>
                        </select>
                    </div>

                    <div className="flex-between mb-4">
                        <h2 className="mb-0">Your Collection 📚</h2>
                        <span style={{ background: '#eef2ff', padding: '5px 12px', borderRadius: '20px', color: '#4f46e5', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {notes.length} Notes
                        </span>
                    </div>

                    <div className="dashboard-grid">
                        {notes.length === 0 && (
                            <div className="glass-card text-center p-5 opacity-80">
                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🕵️‍♀️</div>
                                <p>Tidak ada catatan yang ditemukan.</p>
                                {searchQuery && <p className="text-danger">Coba kata kunci lain?</p>}
                            </div>
                        )}
                        {notes.map((note) => (
                            <div key={note.id} className="glass-card" style={{ padding: '25px', position: 'relative' }}>
                                <div className="flex-between align-start">
                                    <div style={{ marginRight: '10px' }}>
                                        <h3 className="mt-0 text-lg mb-1">{note.title}</h3>
                                        {note.created_at && (
                                            <small className="text-muted">
                                                {new Date(note.created_at + 'Z').toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                        )}
                                    </div>
                                    
                                    <div style={{ display:'flex', gap:'8px' }}>
                                        <button 
                                            onClick={() => handleEdit(note)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', filter: 'grayscale(1)', transition: 'filter 0.2s', padding:'0' }}
                                            className="hover-color"
                                            title="Edit Note"
                                        >✏️</button>
                                        <button 
                                            onClick={() => handleDeleteNote(note.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ff6b6b', padding: '0' }}
                                            title="Delete Note"
                                        >🗑️</button>
                                    </div>
                                </div>
                                <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.05)', margin: '15px 0' }}/>
                                <p style={{ color: '#444', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{note.content}</p>
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
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
