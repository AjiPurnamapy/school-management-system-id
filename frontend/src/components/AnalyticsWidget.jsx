import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * AnalyticsWidget - Dashboard Statistics Component
 * Displays role-based statistics for the school management system
 */
const AnalyticsWidget = ({ user }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                setLoading(true);
                const response = await axios.get('/analytics/dashboard', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError('Gagal memuat statistik');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center',
                color: '#64748b'
            }}>
                ⏳ Memuat statistik...
            </div>
        );
    }

    if (error || !stats) {
        return null; // Silent fail for analytics
    }

    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    // Define stat cards based on role
    const statCards = [];

    // Student-specific cards
    if (isStudent) {
        statCards.push(
            { label: 'Tugas Pending', value: stats.my_pending_tasks ?? 0, icon: '📋', color: '#f59e0b', bg: '#fef3c7' },
            { label: 'Tugas Dinilai', value: stats.my_graded_tasks ?? 0, icon: '✅', color: '#22c55e', bg: '#dcfce7' },
            { label: 'Deadline minggu ini', value: stats.upcoming_deadlines ?? 0, icon: '⏰', color: '#ef4444', bg: '#fee2e2' }
        );
    }

    // Teacher-specific cards  
    if (isTeacher) {
        statCards.push(
            { label: 'Total Siswa', value: stats.total_students ?? 0, icon: '👨‍🎓', color: '#3b82f6', bg: '#dbeafe' },
            { label: 'Tugas Dibuat', value: stats.total_assignments ?? 0, icon: '📝', color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'Belum Dinilai', value: stats.pending_submissions ?? 0, icon: '📋', color: '#f59e0b', bg: '#fef3c7' },
            { label: 'Sudah Dinilai', value: stats.completed_submissions ?? 0, icon: '✅', color: '#22c55e', bg: '#dcfce7' }
        );
    }

    // Admin/Principal see all stats
    if (isAdmin) {
        statCards.push(
            { label: 'Total Siswa', value: stats.total_students ?? 0, icon: '👨‍🎓', color: '#3b82f6', bg: '#dbeafe' },
            { label: 'Total Guru', value: stats.total_teachers ?? 0, icon: '👨‍🏫', color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'Kelas Aktif', value: stats.total_classes ?? 0, icon: '🏫', color: '#22c55e', bg: '#dcfce7' },
            { label: 'Mata Pelajaran', value: stats.total_subjects ?? 0, icon: '📚', color: '#f59e0b', bg: '#fef3c7' }
        );
    }

    return (
        <div style={{ marginBottom: '20px' }}>
            {/* Section Title */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <span style={{ fontSize: '1.25rem' }}>📊</span>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#1e293b' 
                }}>
                    Statistik
                </h3>
            </div>

            {/* Stats Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px' 
            }}>
                {statCards.map((card, index) => (
                    <div 
                        key={index}
                        style={{
                            background: card.bg,
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'default'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between' 
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                            <span style={{ 
                                fontSize: '1.75rem', 
                                fontWeight: '700', 
                                color: card.color 
                            }}>
                                {card.value}
                            </span>
                        </div>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '500', 
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {card.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Upcoming Deadlines Notice (for all roles) */}
            {stats.upcoming_deadlines > 0 && !isStudent && (
                <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid #fecaca'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>⏰</span>
                    <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '500' }}>
                        {stats.upcoming_deadlines} deadline dalam 7 hari ke depan
                    </span>
                </div>
            )}
        </div>
    );
};

export default AnalyticsWidget;
