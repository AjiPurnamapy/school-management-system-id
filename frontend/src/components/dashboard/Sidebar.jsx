import React from 'react';

const Sidebar = ({ user, activeTab, setActiveTab, onLogout, onUploadPhoto }) => {
    return (
        <div className="glass-card dashboard-sidebar" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="sidebar-profile-card">
                <div className="sidebar-profile-header">
                    <div className="profile-avatar-container">
                        <img 
                            src={user?.profile_image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=22c55e&color=fff&size=128`} 
                            alt="Profile"
                            className="profile-avatar"
                        />
                        <input type="file" id="fileInput" hidden accept="image/*" onChange={onUploadPhoto} />
                        <label htmlFor="fileInput" className="avatar-upload-label" title="Ganti Foto">
                            📷
                        </label>
                    </div>
                    
                    <div className="profile-info" style={{ flex: 1 }}>
                        <h3>{user?.name || 'User'}</h3>
                        <p>{user?.email}</p>
                    </div>

                    <button 
                        onClick={() => setActiveTab('profile')}
                        className="profile-edit-btn"
                        title="Edit Profil"
                    >
                        ✏️
                    </button>
                </div>
                <span className="role-badge">
                    {user?.role || 'User'}
                </span>
            </div>

            <div className="sidebar-menu">
                {[
                    { id: 'profile', icon: '👤', label: 'Profil Saya' },
                    { id: 'notes', icon: '📝', label: 'Catatan Saya' },
                    { id: 'storage', icon: '☁️', label: 'Cloud Storage' },
                    ...(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'student' ? [
                        { id: 'classes', icon: '🏫', label: 'Kelas' },
                        { id: 'subjects', icon: '📚', label: 'Mata Pelajaran' },
                        { id: 'schedules', icon: '🗓️', label: 'Jadwal Pelajaran' },
                        { id: 'assignments', icon: '📝', label: 'Tugas & PR' },
                        { id: 'attendance', icon: '📅', label: 'Absensi' },
                        { id: 'analytics', icon: '📊', label: 'Statistik' },
                    ] : [])
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`sidebar-menu-btn ${activeTab === item.id ? 'active' : ''}`}
                    >
                        <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {activeTab === item.id && <span className="arrow">›</span>}
                    </button>
                ))}
                
                <hr className="sidebar-divider" />
                
                <button onClick={onLogout} className="sidebar-logout-btn">
                    <span style={{ fontSize: '1.1rem' }}>🚪</span>
                    <span>Keluar</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
