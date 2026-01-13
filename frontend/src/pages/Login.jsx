import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Cek apakah ada parameter ?verified=true (dari Redirect Backend)
    const [searchParams] = useSearchParams();
    const verified = searchParams.get("verified");

    // Efek Samping: Bersihkan URL supaya kalau direfresh pesan sukses hilang
    useEffect(() => {
        if (verified) {
            // Hapus query param dari URL bar tanpa reload halaman
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [verified]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Form Data required by OAuth2PasswordRequestForm
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            // Tembak API via proxy /token
            const response = await axios.post('/token', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data' // axios automatically sets boundary
                }
            });

            const { access_token } = response.data;
            
            // Simpan token
            localStorage.setItem('token', access_token);
            
            // Redirect ke dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                setError(err.response.data.detail || 'Login gagal');
            } else {
                setError('Tidak dapat terhubung ke server');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 className="text-center mb-4">Welcome Back! 👋</h2>

                {verified && (
                    <div className="alert alert-success mb-4" style={{ textAlign: 'center', background: '#d1fae5', color: '#065f46', padding: '10px', borderRadius: '8px' }}>
                        ✅ Email Verified! Silahkan Login.
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Username / Email</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username or email"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <div className="text-right mb-4">
                        <Link to="/recovery" className="text-sm text-muted hover:text-primary">
                            Lupa Password?
                        </Link>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    
                    {error && <p className="text-danger mt-3">{error}</p>}

                    <div className="mt-4 text-center">
                        <p className="text-muted">
                            Don't have an account? <Link to="/signup">Create one</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
