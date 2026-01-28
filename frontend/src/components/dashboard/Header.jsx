import React from 'react';

const Header = ({ user }) => {
    return (
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', background: 'linear-gradient(135deg, #22c55e, #16a34a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    School Management System
                </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👋 Selamat datang, <strong style={{ color: '#1e293b' }}>{user?.name}</strong>
                </span>
            </div>
        </div>
    );
};
export default Header;
