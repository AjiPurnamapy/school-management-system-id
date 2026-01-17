import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [nis, setNis] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    
    const { toast } = useToast();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/myprofile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            
            // Pre-fill form
            setNis(res.data.nis || '');
            setAddress(res.data.address || '');
            setPhone(res.data.phone || '');
            setBirthDate(res.data.birth_date || '');
        } catch (error) {
            console.error(error);
            toast.error('Gagal memuat profil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('/complete-profile', {
                nis,
                address,
                phone,
                birth_date: birthDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUser(res.data);
            setIsEditing(false);
            toast.success('Profil berhasil diperbarui! 🎉');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.detail || 'Gagal menyimpan profil';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form to original values
        setNis(user?.nis || '');
        setAddress(user?.address || '');
        setPhone(user?.phone || '');
        setBirthDate(user?.birth_date || '');
        setIsEditing(false);
    };

    // Format tanggal untuk display
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    };

    if (loading) {
        return (
            <div className="glass-card p-5 animate-fade-in" style={{ minHeight: '60vh' }}>
                <div className="flex-center flex-col py-20">
                    <div className="spinner mb-3"></div>
                    <p className="text-slate-500">Memuat profil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-5 animate-fade-in" style={{ minHeight: '60vh' }}>
            {/* Header */}
            <div className="flex-between align-center mb-6">
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', margin: 0, marginBottom: '4px' }}>
                        👤 Profil Saya
                    </h2>
                    <p className="text-muted m-0">Lihat dan kelola informasi pribadi Anda</p>
                </div>
                
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✏️ Edit Profil
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                color: '#64748b',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {saving ? 'Menyimpan...' : '💾 Simpan'}
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px' }}>
                
                {/* Left: Photo & Basic Info */}
                <div style={{ 
                    background: '#f8fafc', 
                    borderRadius: '16px', 
                    padding: '24px',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                }}>
                    <img 
                        src={user?.profile_image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=22c55e&color=fff&size=128`}
                        alt="Profile"
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '4px solid white',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            marginBottom: '16px'
                        }}
                    />
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                        {user?.name}
                    </h3>
                    <p style={{ margin: '8px 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
                        {user?.email}
                    </p>
                    <span style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        background: '#dcfce7',
                        color: '#16a34a',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                    }}>
                        {user?.role}
                    </span>
                    
                    {/* Profile Completion Badge */}
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '12px', 
                        background: user?.is_profile_complete ? '#f0fdf4' : '#fef3c7',
                        borderRadius: '10px',
                        border: `1px solid ${user?.is_profile_complete ? '#bbf7d0' : '#fde68a'}`
                    }}>
                        <span style={{ 
                            fontSize: '0.85rem', 
                            color: user?.is_profile_complete ? '#16a34a' : '#d97706',
                            fontWeight: '600'
                        }}>
                            {user?.is_profile_complete ? '✅ Profil Lengkap' : '⚠️ Profil Belum Lengkap'}
                        </span>
                    </div>
                </div>

                {/* Right: Detail Info */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '16px', 
                    padding: '24px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
                        📋 Informasi Pribadi
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* NIS/NIP */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                {user?.role === 'teacher' ? 'NIP' : 'NIS'}
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={nis}
                                    onChange={(e) => setNis(e.target.value)}
                                    required
                                    minLength={5}
                                    maxLength={20}
                                    placeholder="Masukkan NIS/NIP"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '500' }}>
                                    {user?.nis || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
                                </p>
                            )}
                        </div>

                        {/* Alamat */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                Alamat
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    required
                                    minLength={10}
                                    maxLength={500}
                                    rows={2}
                                    placeholder="Masukkan alamat lengkap"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        resize: 'none',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            ) : (
                                <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '500' }}>
                                    {user?.address || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
                                </p>
                            )}
                        </div>

                        {/* Nomor HP */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                Nomor HP
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    minLength={10}
                                    maxLength={20}
                                    placeholder="Contoh: 081234567890"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '500' }}>
                                    {user?.phone || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
                                </p>
                            )}
                        </div>

                        {/* Tanggal Lahir */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                Tanggal Lahir
                            </label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '500' }}>
                                    {user?.birth_date ? formatDate(user.birth_date) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diisi</span>}
                                </p>
                            )}
                        </div>

                        {/* Umur (Read Only) */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                Umur
                            </label>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '500' }}>
                                {user?.age ? `${user.age} tahun` : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
