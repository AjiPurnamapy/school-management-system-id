import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import '../styles/PageTransitions.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Cek apakah ada parameter ?verified=true (dari Redirect Backend)
    const [searchParams] = useSearchParams();
    const verified = searchParams.get("verified");

    // Efek Samping: Bersihkan URL supaya kalau direfresh pesan sukses hilang
    useEffect(() => {
        if (verified) {
            toast.success("Email berhasil diverifikasi! Silakan login.");
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [verified, toast]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await axios.post('/token', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            
            // Check if profile is complete
            const profileRes = await axios.get('/myprofile', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            
            if (!profileRes.data.is_profile_complete) {
                toast.info("Silakan lengkapi profil Anda terlebih dahulu.");
                navigate('/complete-profile');
            } else {
                toast.success("Login Berhasil! Selamat datang.");
                navigate('/dashboard');
            }

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                // Gunakan inline error untuk feedback form
                setError(err.response.data.detail || 'Login gagal');
                // Optional: Toast juga ok jika user sangat ingin
                // toast.error("Login Gagal: Periksa username/password");
            } else {
                const msg = 'Tidak dapat terhubung ke server';
                setError(msg);
                toast.error(msg); // Toast untuk network error
            }
        } finally {
            setLoading(false);
        }
    };

    // Styles
    const containerStyle = {
        display: 'flex',
        minHeight: '100vh',
        background: '#fff'
    };

    const leftPanelStyle = {
        flex: 1,
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative'
    };

    const rightPanelStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px'
    };

    const logoStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '48px'
    };

    const inputStyle = {
        width: '100%',
        padding: '14px 16px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        background: '#fff'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.9rem',
        color: '#666',
        fontWeight: '500'
    };

    const buttonStyle = {
        width: '100%',
        padding: '14px',
        background: '#1e293b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: '16px'
    };

    return (
        <div className="auth-container">
            {/* Left Panel - Illustration */}
            <div className="auth-left-panel">
                {/* Placeholder Illustration - akan diganti dengan gambar user */}
                <div style={{
                    width: '320px',
                    height: '320px',
                    background: 'radial-gradient(circle, rgba(129,199,132,0.3) 0%, transparent 70%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '32px'
                }}>
                    <img 
                        src="https://illustrations.popsy.co/green/student-going-to-school.svg"
                        alt="Education Illustration"
                        style={{
                            width: '280px',
                            height: '280px',
                            objectFit: 'contain'
                        }}
                    />
                </div>

                {/* Title & Description */}
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '12px',
                    textAlign: 'center'
                }}>
                    School Management
                </h2>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    textAlign: 'center',
                    maxWidth: '280px',
                    lineHeight: '1.6'
                }}>
                    Platform manajemen sekolah modern untuk guru, siswa, dan administrator.
                </p>

                {/* Dots Indicator */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '32px'
                }}>
                    <div style={{ width: '24px', height: '8px', borderRadius: '4px', background: '#4caf50' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#c8e6c9' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#c8e6c9' }}></div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="auth-right-panel">
                {/* Logo */}
                <div className="auth-logo" style={logoStyle}>
                    <span style={{ fontSize: '1.75rem' }}>🎓</span>
                    <span style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '300',
                        color: '#1e293b',
                        letterSpacing: '2px'
                    }}>
                        SCHOOL
                    </span>
                    <span style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: '700',
                        color: '#4caf50'
                    }}>
                        HUB
                    </span>
                </div>

                {/* Form Container */}
                <div style={{ width: '100%', maxWidth: '360px' }}>
                    {verified && (
                        <div style={{ 
                            textAlign: 'center', 
                            background: '#d1fae5', 
                            color: '#065f46', 
                            padding: '12px', 
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.9rem'
                        }}>
                            ✅ Email Verified! Silahkan Login.
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        {/* Username Field */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Username or email</label>
                            <input 
                                type="text"
                                style={inputStyle}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Masukkan username atau email"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Password Field */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={labelStyle}>Password</label>
                            <input 
                                type="password"
                                style={inputStyle}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Forgot Password */}
                        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                            <Link 
                                to="/recovery" 
                                style={{ 
                                    color: '#4caf50', 
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Sign In Button */}
                        <button 
                            type="submit" 
                            style={buttonStyle}
                            disabled={loading}
                            onMouseOver={(e) => {
                                if (!loading) e.target.style.background = '#334155';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = '#1e293b';
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        {/* Error Message */}
                        {error && (
                            <p style={{ 
                                color: '#ef4444', 
                                textAlign: 'center', 
                                marginTop: '16px',
                                fontSize: '0.9rem'
                            }}>
                                {error}
                            </p>
                        )}

                        {/* Divider */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            margin: '32px 0',
                            gap: '16px'
                        }}>
                            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
                        </div>

                        {/* Create Account Link */}
                        <p style={{ 
                            textAlign: 'center', 
                            color: '#64748b',
                            fontSize: '0.95rem'
                        }}>
                            Are you new?{' '}
                            <Link 
                                to="/signup" 
                                style={{ 
                                    color: '#4caf50', 
                                    textDecoration: 'underline',
                                    fontWeight: '600'
                                }}
                            >
                                Create an Account
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
