import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [notes, setNotes] = useState([]);
    const [user, setUser] = useState(null); // Data user (nama, email, foto)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Fungsi Fetch Global (Notes + Profile)
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        try {
            // Kita pakai Promise.all agar parallel fetching
            const [notesRes, userRes] = await Promise.all([
                axios.get('/notes/', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/myprofile', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            setNotes(notesRes.data);
            setUser(userRes.data);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ... (keep handleCreateNote and handleDeleteNote as is) ...
    // Note: re-implementing them briefly to match context, or assume they exist? 
    // Since I'm replacing the whole component logic block usually, I'll keep them concise.
    
    // Fungsi Submit Notes Baru
    const handleCreateNote = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await axios.post('/notes/', { title, content }, { headers: { Authorization: `Bearer ${token}` }});
            setTitle(''); setContent('');
            // Partial refresh notes only
            const res = await axios.get('/notes/', { headers: { Authorization: `Bearer ${token}` }});
            setNotes(res.data);
        } catch (err) {
            const msg = err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : "Gagal membuat catatan";
            alert(msg);
        }
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm("Yakin ingin menghapus catatan ini?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/notes/${id}`, { headers: { Authorization: `Bearer ${token}` }});
            // Remove locally to save bandwidth
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) { alert("Gagal menghapus catatan"); }
    };

    // Fungsi Upload Foto
    const handleUploadPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('/upload-photo', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Update state user agar gambar langsung berubah
            setUser(prev => ({...prev, profile_image: res.data.url}));
            alert("Foto profil berhasil diupdate!");
        } catch (err) {
            alert("Gagal upload foto");
        }
    };

    const handleLogout = () => { localStorage.removeItem('token'); navigate('/'); };

    if (loading) return <div style={{color:'white'}}>Loading...</div>;

    return (
        <div style={{ width: '100%', maxWidth: '1200px', padding: '20px' }}>
            {/* Header dengan Profile Info */}
            <div className="glass-card" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Avatar Area */}
                    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img 
                            src={user?.profile_image ? user.profile_image : `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                            alt="Profile"
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        />
                        {/* Hidden Input File */}
                        <input 
                            type="file" id="fileInput" hidden 
                            accept="image/*" onChange={handleUploadPhoto} 
                        />
                        {/* Edit Button Overlay */}
                        <label htmlFor="fileInput" 
                            style={{ 
                                position: 'absolute', bottom: '0', right: '0', 
                                background: '#2575fc', color: 'white', borderRadius: '50%', 
                                width: '25px', height: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                cursor: 'pointer', fontSize: '14px', border: '2px solid white'
                            }}
                            title="Ganti Foto"
                        >
                            📷
                        </label>
                    </div>
                    
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Halo, {user?.name}! 👋</h1>
                        <p style={{ margin: '5px 0', color: '#666' }}>{user?.email}</p>
                    </div>
                </div>

                <button onClick={handleLogout} className="btn-primary" style={{ width: 'auto', background: '#dc3545' }}>
                    Logout
                </button>
            </div>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                
                {/* Kolom Kiri: Form Buat Note (Sticky) */}
                <div className="glass-card" style={{ width: '350px', position: 'sticky', top: '20px', flexShrink: 0 }}>
                    <h3 style={{ marginTop: 0 }}>+ New Note</h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                        Tulis idemu di sini agar tidak lupa.
                    </p>
                    <form onSubmit={handleCreateNote}>
                        <div className="form-group">
                            <label className="form-label">
                                Title <small style={{ color: '#888', fontWeight: 'normal' }}>(min. 3 chars)</small>
                            </label>
                            <input 
                                type="text" className="form-control"
                                value={title} onChange={(e) => setTitle(e.target.value)} 
                                minLength={3} placeholder="Judul catatan..." required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Content <small style={{ color: '#888', fontWeight: 'normal' }}>(min. 4 chars)</small>
                            </label>
                            <textarea 
                                className="form-control" rows="8"
                                value={content} onChange={(e) => setContent(e.target.value)} 
                                minLength={4} placeholder="Isi catatan..." required 
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-primary">Save Note</button>
                    </form>
                </div>

                {/* Kolom Kanan: Daftar Notes (Scrollable Area) */}
                <div style={{ flex: 1 }}>
                    <div className="glass-card" style={{ marginBottom: '20px', padding: '15px 30px', background: 'rgba(255,255,255,0.4)' }}>
                        <h2 style={{ margin: 0 }}>Your Collection 📚</h2>
                        <small>Total: {notes.length} notes</small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {notes.length === 0 && (
                            <div className="glass-card" style={{ width: '100%', textAlign: 'center', opacity: 0.8 }}>
                                <p>Belum ada catatan. Mulai dengan membuatnya di sebelah kiri! 👈</p>
                            </div>
                        )}
                        {notes.map((note) => (
                            <div key={note.id} className="glass-card" style={{ padding: '25px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ marginTop: 0, fontSize: '1.2rem', maxWidth: '80%' }}>{note.title}</h3>
                                    <button 
                                        onClick={() => handleDeleteNote(note.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#dc3545', padding: '0 5px' }}
                                        title="Delete Note"
                                    >🗑️</button>
                                </div>
                                <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '15px 0' }}/>
                                <p style={{ color: '#444', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
