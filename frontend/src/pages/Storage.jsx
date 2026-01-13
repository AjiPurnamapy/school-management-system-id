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
        <div className="storage-container">
            <div className="flex-between mb-4">
                <h2 className="mb-0">Cloud Storage ☁️</h2>
                
                <div className="upload-btn-wrapper">
                    <label className={`btn-primary ${uploading ? 'disabled' : ''}`} style={{cursor: 'pointer', display: 'inline-block', width: 'auto', padding: '10px 20px'}}>
                        {uploading ? 'Uploading...' : '📤 Upload File'}
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
                <div className="text-center text-muted mt-5">Loading files...</div>
            ) : files.length === 0 ? (
                <div className="text-center text-muted mt-5">
                    <p style={{fontSize: '3rem'}}>📭</p>
                    <p>Belum ada file tersimpan.</p>
                </div>
            ) : (
                <div className="file-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '20px' 
                }}>
                    {files.map(file => (
                        <div key={file.id} className="glass-card text-center p-3" style={{position: 'relative'}}>
                            <div style={{fontSize: '3rem', marginBottom: '10px'}}>
                                {getFileIcon(file.file_type)}
                            </div>
                            <h5 style={{fontSize: '0.9rem', wordBreak: 'break-all', marginBottom: '15px'}}>
                                {file.filename}
                            </h5>
                            
                            <div className="flex-center gap-2">
                                <a 
                                    href={getDownloadUrl(file.file_url)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn-sm btn-outline-primary text-decoration-none"
                                    style={{fontSize: '1.2rem'}}
                                    download 
                                >
                                    ⬇️
                                </a>
                                <button 
                                    onClick={() => handleDelete(file.id)}
                                    className="btn-sm btn-outline-danger"
                                    style={{border: 'none', background: 'transparent', color: '#dc3545', fontSize: '1.2rem', cursor: 'pointer'}}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Storage;
