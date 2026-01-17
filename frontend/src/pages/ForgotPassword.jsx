import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/PageTransitions.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.detail || 'Gagal mengirim permintaan');
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
        padding: '40px'
    };

    const rightPanelStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px'
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
                <div style={{
                    width: '280px',
                    height: '280px',
                    background: 'radial-gradient(circle, rgba(129,199,132,0.3) 0%, transparent 70%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '32px'
                }}>
                    <img 
                        src="https://illustrations.popsy.co/green/email.svg"
                        alt="Email Illustration"
                        style={{
                            width: '200px',
                            height: '200px',
                            objectFit: 'contain'
                        }}
                    />
                </div>

                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '12px',
                    textAlign: 'center'
                }}>
                    Reset Password
                </h2>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    textAlign: 'center',
                    maxWidth: '280px',
                    lineHeight: '1.6'
                }}>
                    Kami akan mengirimkan link reset password ke email Anda.
                </p>
            </div>

            {/* Right Panel - Form */}
            <div className="auth-right-panel">
                {/* Logo */}
                <div className="auth-logo" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '48px'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>🎓</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1e293b', letterSpacing: '2px' }}>SCHOOL</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4caf50' }}>HUB</span>
                </div>

                {/* Form Container */}
                <div style={{ width: '100%', maxWidth: '360px' }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '8px',
                        textAlign: 'center'
                    }}>
                        Lupa Password? 🔒
                    </h3>
                    <p style={{
                        color: '#64748b',
                        textAlign: 'center',
                        marginBottom: '32px',
                        fontSize: '0.95rem'
                    }}>
                        Masukkan email Anda untuk menerima link reset.
                    </p>

                    {message && (
                        <div style={{ 
                            background: '#d1fae5', 
                            color: '#065f46', 
                            padding: '12px', 
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            ✅ {message}
                        </div>
                    )}

                    {error && (
                        <div style={{ 
                            background: '#fee2e2', 
                            color: '#dc2626', 
                            padding: '12px', 
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Email Address</label>
                            <input 
                                type="email"
                                style={inputStyle}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="contoh@email.com"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

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
                            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div style={{ textAlign: 'center', marginTop: '32px' }}>
                        <Link 
                            to="/" 
                            style={{ 
                                color: '#4caf50', 
                                textDecoration: 'none',
                                fontSize: '0.95rem',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            ← Kembali ke Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
