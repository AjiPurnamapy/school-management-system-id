import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Storage = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Fetch Files saat komponen di-load
    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/files/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // SAFETY CHECK: Pastikan response adalah Array agar tidak CRASH
            if (Array.isArray(res.data)) {
                setFiles(res.data);
            } else {
                console.error("Error: Endpoint /files/ tidak mengembalikan array!", res.data);
                setFiles([]);
            }
        } catch (err) {
            console.error("Gagal ambil file:", err);
            setError("Gagal memuat file.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validasi ukuran (misal max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file terlalu besar (Max 5MB)");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            await axios.post('/files/upload', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Refresh list setelah upload
            fetchFiles(); 
        } catch (err) {
            console.error(err);
            alert("Gagal upload file!");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm("Yakin hapus file ini?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/files/${fileId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Hapus dari state lokal
            setFiles(files.filter(f => f.id !== fileId));
        } catch (err) {
            alert("Gagal menghapus file");
        }
    };

    // Helper untuk Icon berdasarkan tipe file
    const getFileIcon = (type) => {
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('word')) return '📝';
        return '📦';
    };

    const getDownloadUrl = (path) => {
        return path; 
    };

    return (
        <div className="glass-card p-6" style={{ minHeight: '80vh' }}>
            <div className="flex-between align-center mb-8">
                <div>
                     <h2 className="mb-1" style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>
                        Cloud Storage ☁️
                     </h2>
                     <p className="text-muted m-0">Simpan dan bagikan materi pembelajaran.</p>
                </div>
                
                <div className="upload-btn-wrapper">
                    <label className={`btn-primary ${uploading ? 'disabled' : ''}`} style={{
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                        width: 'auto', padding: '12px 24px', background: '#4f46e5',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                    }}>
                        {uploading ? (
                            <>
                                <div className="spinner" style={{width:'20px', height:'20px', border:'2px solid white', borderTop:'2px solid transparent'}}></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                📤 <span>Upload File</span>
                            </>
                        )}
                        <input 
                            type="file" 
                            hidden 
                            onChange={handleUpload} 
                            disabled={uploading}
                            accept=".pdf,.docx,.jpg,.jpeg,.png"
                        />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="flex-center p-20 flex-col text-slate-400">
                    <div className="spinner mb-4"></div>
                    <p>Memuat file...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-20 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <div style={{ fontSize: '4rem', marginBottom: '15px', color: '#cbd5e1' }}>📭</div>
                    <p className="text-slate-500 text-lg font-medium">Belum ada file tersimpan.</p>
                    <p className="text-slate-400 text-sm">Upload materi agar siswa bisa mengaksesnya.</p>
                </div>
            ) : (
                <div className="file-grid animate-fade-in" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '20px',
                    padding: '10px 0' 
                }}>
                    {files.map((file, index) => (
                        <div key={file.id} className="glass-card hover-card" style={{ padding: '20px', position: 'relative', transition: 'all 0.2s', borderLeft: '4px solid #4f46e5', animationDelay: `${index * 50}ms` }}>
                            <div className="flex-between align-start">
                                <div style={{ marginRight: '10px', width: '100%', overflow: 'hidden' }}>
                                    <h3 className="mt-0 text-lg mb-1 font-bold text-slate-800 line-clamp-1" title={file.filename}>
                                        {getFileIcon(file.file_type)} {file.filename}
                                    </h3>
                                    <small className="text-muted flex align-center gap-1">
                                        🕒 {new Date(file.created_at || Date.now()).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                                    </small>
                                </div>
                                
                                <div style={{ display:'flex', gap:'8px' }}>
                                    <a 
                                        href={getDownloadUrl(file.file_url)} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        download
                                        style={{ background: '#eff6ff', border: 'none', cursor: 'pointer', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}
                                        className="hover:bg-blue-100"
                                        title="Download File"
                                    >⬇️</a>
                                    <button 
                                        onClick={() => handleDelete(file.id)}
                                        style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color: '#ef4444' }}
                                        className="hover:bg-red-100"
                                        title="Hapus File"
                                    >🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Storage;
