import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Ambil token dari URL (?token=...)
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setError("Token tidak valid atau hilang. Silahkan request ulang.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/reset-password', { 
                token: token,
                new_password: newPassword 
            });
            setMessage(res.data.message);
            
            // Redirect ke login setelah 3 detik
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Gagal mereset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return <div className="glass-card text-center text-danger">{error}</div>;
    }

    return (
        <div className="auth-wrapper">
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 className="text-center mb-4">Reset Password 🔑</h2>
                
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Password Baru</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 8 karakter"
                            minLength={8}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
