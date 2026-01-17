import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import '../styles/PageTransitions.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password.length < 8) {
            setError("Password minimal 8 karakter");
            setLoading(false);
            return;
        }

        try {
            await axios.post('/register', {
                ...formData,
                age: parseInt(formData.age),
            });
            toast.success("Registrasi Berhasil! Silakan cek email Anda untuk verifikasi akun.");
            navigate('/');
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                setError(err.response.data.detail || 'Registrasi gagal');
            } else {
                setError('Tidak dapat terhubung ke server');
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
        padding: '40px'
    };

    const rightPanelStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        overflowY: 'auto'
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
        marginTop: '8px'
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
                        src="https://illustrations.popsy.co/green/man-riding-a-rocket.svg"
                        alt="Register Illustration"
                        style={{
                            width: '220px',
                            height: '220px',
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
                    Bergabung Bersama Kami
                </h2>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    textAlign: 'center',
                    maxWidth: '280px',
                    lineHeight: '1.6'
                }}>
                    Daftar sekarang dan nikmati semua fitur platform School Management.
                </p>

                {/* Dots Indicator */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '32px'
                }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#c8e6c9' }}></div>
                    <div style={{ width: '24px', height: '8px', borderRadius: '4px', background: '#4caf50' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#c8e6c9' }}></div>
                </div>
            </div>

            {/* Right Panel - Register Form */}
            <div className="auth-right-panel" style={{ overflowY: 'auto', padding: '40px' }}>
                {/* Logo */}
                <div className="auth-logo" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '32px'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>🎓</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1e293b', letterSpacing: '2px' }}>SCHOOL</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4caf50' }}>HUB</span>
                </div>

                {/* Form Container */}
                <div style={{ width: '100%', maxWidth: '380px' }}>
                    <h3 style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '24px',
                        textAlign: 'center'
                    }}>
                        Create Account 🚀
                    </h3>

                    {error && (
                        <div style={{ 
                            background: '#fee2e2', 
                            color: '#dc2626', 
                            padding: '12px', 
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} autoComplete="off">
                        {/* Name */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Full Name</label>
                            <input 
                                type="text"
                                name="fullname"
                                autoComplete="off"
                                style={inputStyle}
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. Aji Purnomo"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Email Address</label>
                            <input 
                                type="email"
                                name="new-email"
                                autoComplete="off"
                                style={inputStyle}
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="name@example.com"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Age */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Age</label>
                            <input 
                                type="number"
                                name="user-age"
                                autoComplete="off"
                                style={inputStyle}
                                value={formData.age}
                                onChange={(e) => setFormData({...formData, age: e.target.value})}
                                placeholder="e.g. 17"
                                min="1"
                                required
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Password</label>
                            <input 
                                type="password"
                                name="new-password"
                                style={inputStyle}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Min. 8 characters"
                                required
                                autoComplete="new-password"
                                onFocus={(e) => e.target.style.borderColor = '#4caf50'}
                                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                            />
                        </div>

                        {/* Submit Button */}
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
                            {loading ? 'Creating Account...' : 'Register Now'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        margin: '24px 0',
                        gap: '16px'
                    }}>
                        <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }}></div>
                    </div>

                    {/* Login Link */}
                    <p style={{ 
                        textAlign: 'center', 
                        color: '#64748b',
                        fontSize: '0.95rem'
                    }}>
                        Already have an account?{' '}
                        <Link 
                            to="/" 
                            style={{ 
                                color: '#4caf50', 
                                textDecoration: 'underline',
                                fontWeight: '600'
                            }}
                        >
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
