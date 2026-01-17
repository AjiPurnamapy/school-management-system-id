import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

const CompleteProfile = () => {
    const [nis, setNis] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('student');
    
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Check if user is logged in and get their info
        const checkProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            
            try {
                const res = await axios.get('/myprofile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // If profile already complete, redirect to dashboard
                if (res.data.is_profile_complete) {
                    navigate('/dashboard');
                    return;
                }
                
                setUserName(res.data.name);
                setUserRole(res.data.role);
            } catch (error) {
                console.error(error);
                navigate('/login');
            }
        };
        
        checkProfile();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const token = localStorage.getItem('token');
            await axios.put('/complete-profile', {
                nis,
                address,
                phone,
                birth_date: birthDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success('Profil berhasil dilengkapi! 🎉');
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.detail || 'Gagal menyimpan profil. Silakan coba lagi.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ 
                        fontSize: '3rem', 
                        marginBottom: '12px'
                    }}>
                        📝
                    </div>
                    <h1 style={{ 
                        fontSize: '1.75rem', 
                        fontWeight: '800', 
                        color: '#1e293b',
                        margin: 0,
                        marginBottom: '8px'
                    }}>
                        Lengkapi Profil Anda
                    </h1>
                    <p style={{ 
                        color: '#64748b', 
                        margin: 0,
                        fontSize: '0.95rem'
                    }}>
                        Halo <strong>{userName}</strong>! Silakan lengkapi data diri Anda untuk melanjutkan.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* NIS/NIP */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '600', 
                                color: '#334155',
                                fontSize: '0.9rem'
                            }}>
                                {userRole === 'teacher' ? 'NIP (Nomor Induk Pegawai)' : 'NIS (Nomor Induk Siswa)'}
                                <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={nis}
                                onChange={(e) => setNis(e.target.value)}
                                placeholder={userRole === 'teacher' ? 'Masukkan NIP Anda' : 'Masukkan NIS Anda'}
                                required
                                minLength={5}
                                maxLength={20}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#22c55e';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Alamat */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '600', 
                                color: '#334155',
                                fontSize: '0.9rem'
                            }}>
                                Alamat Lengkap <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Masukkan alamat lengkap Anda"
                                required
                                minLength={10}
                                maxLength={500}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    resize: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#22c55e';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Nomor HP */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '600', 
                                color: '#334155',
                                fontSize: '0.9rem'
                            }}>
                                Nomor HP <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Contoh: 081234567890"
                                required
                                minLength={10}
                                maxLength={20}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#22c55e';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Tanggal Lahir */}
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '600', 
                                color: '#334155',
                                fontSize: '0.9rem'
                            }}>
                                Tanggal Lahir <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#22c55e';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                marginTop: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: '20px', height: '20px' }}></span>
                                    Menyimpan...
                                </>
                            ) : (
                                <>✅ Simpan & Lanjutkan</>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Note */}
                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '24px', 
                    color: '#94a3b8',
                    fontSize: '0.85rem'
                }}>
                    Data ini akan digunakan untuk keperluan administrasi sekolah.
                </p>
            </div>
        </div>
    );
};

export default CompleteProfile;
