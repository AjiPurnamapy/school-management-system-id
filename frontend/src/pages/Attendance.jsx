import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

/**
 * Attendance Page - Absensi Siswa
 * Beautiful, Polished UI with Green Glassmorphism Theme
 */
const Attendance = () => {
    const [schedules, setSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('record');
    const [summary, setSummary] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const { toast } = useToast();
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isTeacherOrAdmin = ['teacher', 'admin', 'principal'].includes(currentUser.role);

    useEffect(() => { fetchSchedules(); }, []);

    const fetchSchedules = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/schedules/', { headers: { Authorization: `Bearer ${token}` } });
            setSchedules(response.data);
        } catch (err) {
            toast('Gagal memuat jadwal', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsForClass = async (classId) => {
        try {
            const response = await axios.get(`/classes/${classId}/students`, { headers: { Authorization: `Bearer ${token}` } });
            setStudents(response.data || []);
            const initialData = {};
            (response.data || []).forEach(student => initialData[student.id] = { status: 'hadir', notes: '' });
            setAttendanceData(initialData);
        } catch (err) { setStudents([]); }
    };

    const fetchExistingAttendance = async (scheduleId, date) => {
        try {
            const response = await axios.get(`/attendance/schedule/${scheduleId}?date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
            const existingData = {};
            response.data.forEach(record => existingData[record.student_id] = { status: record.status, notes: record.notes || '' });
            setAttendanceData(prev => ({ ...prev, ...existingData }));
        } catch (err) { console.error(err); }
    };

    const fetchClassSummary = async (classId) => {
        try {
            const response = await axios.get(`/attendance/summary/class/${classId}`, { headers: { Authorization: `Bearer ${token}` } });
            setSummary(response.data || []);
        } catch (err) { console.error(err); }
    };

    const handleScheduleSelect = async (schedule) => {
        setSelectedSchedule(schedule);
        await fetchStudentsForClass(schedule.class_id);
        await fetchExistingAttendance(schedule.id, selectedDate);
        if (viewMode === 'history') await fetchClassSummary(schedule.class_id);
    };

    useEffect(() => {
        if (selectedSchedule) {
            viewMode === 'record' ? fetchExistingAttendance(selectedSchedule.id, selectedDate) : fetchClassSummary(selectedSchedule.class_id);
        }
    }, [selectedDate, viewMode]);

    const handleSaveAttendance = async () => {
        if (!selectedSchedule) return;
        try {
            setSaving(true);
            const records = Object.entries(attendanceData)
                .filter(([studentId]) => students.find(s => s.id === parseInt(studentId)))
                .map(([studentId, data]) => ({ student_id: parseInt(studentId), status: data.status, notes: data.notes }));
            
            await axios.post('/attendance/bulk', { schedule_id: selectedSchedule.id, date: selectedDate, records }, { headers: { Authorization: `Bearer ${token}` } });
            toast('Absensi berhasil disimpan!', 'success');
            await fetchExistingAttendance(selectedSchedule.id, selectedDate);
        } catch (err) { toast('Gagal menyimpan', 'error'); } finally { setSaving(false); }
    };

    const statusOptions = [
        { value: 'hadir', label: 'Hadir', icon: '✅', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
        { value: 'izin', label: 'Izin', icon: '📝', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
        { value: 'sakit', label: 'Sakit', icon: '🏥', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
        { value: 'alfa', label: 'Alfa', icon: '❌', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' }
    ];

    const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Styles
    const styles = {
        container: {
            padding: '0 0 40px 0',
            animation: 'fadeIn 0.3s ease-out'
        },
        header: {
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '24px',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)'
        },
        headerDecor: {
            position: 'absolute',
            right: '-50px',
            top: '-50px',
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%'
        },
        headerDecor2: {
            position: 'absolute',
            right: '50px',
            bottom: '-80px',
            width: '150px',
            height: '150px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%'
        },
        title: {
            fontSize: '28px',
            fontWeight: '800',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        subtitle: {
            fontSize: '15px',
            opacity: '0.9',
            margin: 0,
            fontWeight: '500'
        },
        tabContainer: {
            display: 'flex',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '4px',
            backdropFilter: 'blur(10px)'
        },
        tab: (active) => ({
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            background: active ? 'white' : 'transparent',
            color: active ? '#16a34a' : 'rgba(255,255,255,0.9)',
            boxShadow: active ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
        }),
        mainGrid: {
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '24px',
            alignItems: 'start'
        },
        sidebar: {
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
        },
        sidebarHeader: {
            padding: '20px',
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        scheduleList: {
            maxHeight: '500px',
            overflowY: 'auto',
            padding: '12px'
        },
        scheduleItem: (selected) => ({
            padding: '16px',
            borderRadius: '14px',
            marginBottom: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: selected ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#f8fafc',
            color: selected ? 'white' : '#1f2937',
            border: selected ? 'none' : '1px solid #e2e8f0',
            boxShadow: selected ? '0 6px 20px rgba(34, 197, 94, 0.3)' : 'none',
            transform: selected ? 'scale(1.02)' : 'scale(1)'
        }),
        contentCard: {
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
        },
        toolbar: {
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
        },
        dateInput: {
            padding: '10px 16px',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            background: 'white',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        searchInput: {
            padding: '10px 16px 10px 40px',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            fontSize: '14px',
            width: '220px',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        saveBtn: {
            padding: '12px 28px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        table: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0'
        },
        th: {
            padding: '16px 20px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: '#f8fafc',
            borderBottom: '2px solid #e2e8f0'
        },
        td: {
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            verticalAlign: 'middle'
        },
        studentCell: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
        },
        avatar: {
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            objectFit: 'cover'
        },
        studentName: {
            fontWeight: '600',
            color: '#1f2937',
            fontSize: '15px'
        },
        studentEmail: {
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: '2px'
        },
        statusBtn: (active, opt) => ({
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: active ? `2px solid ${opt.border}` : '2px solid transparent',
            background: active ? opt.bg : '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            transition: 'all 0.2s ease',
            transform: active ? 'scale(1.1)' : 'scale(1)',
            boxShadow: active ? `0 4px 12px ${opt.bg}` : 'none'
        }),
        notesInput: {
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '2px solid #e2e8f0',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.2s',
            background: '#fafafa'
        },
        emptyState: {
            padding: '80px 40px',
            textAlign: 'center',
            color: '#94a3b8'
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
                <div style={{ width: '50px', height: '50px', border: '4px solid #dcfce7', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '500' }}>Memuat data absensi...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Beautiful Header */}
            <div style={styles.header}>
                <div style={styles.headerDecor}></div>
                <div style={styles.headerDecor2}></div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={styles.title}>
                            <span style={{ fontSize: '32px' }}>📋</span>
                            Absensi Siswa
                        </h1>
                        <p style={styles.subtitle}>
                            {isTeacherOrAdmin ? 'Kelola kehadiran siswa dengan mudah dan cepat' : 'Lihat riwayat kehadiran Anda'}
                        </p>
                    </div>
                    {isTeacherOrAdmin && (
                        <div style={styles.tabContainer}>
                            <button style={styles.tab(viewMode === 'record')} onClick={() => setViewMode('record')}>📝 Catat Absensi</button>
                            <button style={styles.tab(viewMode === 'history')} onClick={() => setViewMode('history')}>📊 Rekap Data</button>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* Sidebar - Schedule Selection */}
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <span style={{ fontSize: '20px' }}>🗓️</span>
                        <span style={{ fontWeight: '700', color: '#1f2937' }}>Jadwal Pelajaran</span>
                    </div>
                    <div style={styles.scheduleList}>
                        {schedules.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📭</span>
                                Belum ada jadwal
                            </div>
                        ) : schedules.map(schedule => (
                            <div
                                key={schedule.id}
                                style={styles.scheduleItem(selectedSchedule?.id === schedule.id)}
                                onClick={() => handleScheduleSelect(schedule)}
                            >
                                <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{schedule.subject_name}</div>
                                <div style={{ fontSize: '13px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🏫 {schedule.class_name}</span>
                                    <span>•</span>
                                    <span>{schedule.day}</span>
                                </div>
                                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                                    🕐 {schedule.start_time} - {schedule.end_time}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div style={styles.contentCard}>
                    {!selectedSchedule ? (
                        <div style={styles.emptyState}>
                            <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>👈</span>
                            <h3 style={{ margin: '0 0 8px 0', color: '#475569', fontWeight: '700' }}>Pilih Jadwal Pelajaran</h3>
                            <p style={{ margin: 0 }}>Klik salah satu jadwal di sebelah kiri untuk mulai</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div style={styles.toolbar}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>{selectedSchedule.subject_name}</div>
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>{selectedSchedule.class_name} • {selectedSchedule.day}</div>
                                    </div>
                                </div>
                                {viewMode === 'record' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            style={styles.dateInput}
                                        />
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🔍</span>
                                            <input
                                                type="text"
                                                placeholder="Cari siswa..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={styles.searchInput}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveAttendance} 
                                            disabled={saving}
                                            style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
                                        >
                                            {saving ? '⏳' : '💾'} {saving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Table Content */}
                            <div style={{ overflowX: 'auto' }}>
                                {viewMode === 'record' ? (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>No</th>
                                                <th style={styles.th}>Nama Siswa</th>
                                                <th style={{ ...styles.th, textAlign: 'center', width: '220px' }}>Status Kehadiran</th>
                                                <th style={styles.th}>Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ ...styles.td, textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                                        {students.length === 0 ? 'Tidak ada siswa di kelas ini' : 'Siswa tidak ditemukan'}
                                                    </td>
                                                </tr>
                                            ) : filteredStudents.map((student, idx) => (
                                                <tr key={student.id} style={{ transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <span style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', fontWeight: '700', fontSize: '13px', alignItems: 'center', justifyContent: 'center' }}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.studentCell}>
                                                            <img 
                                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff&size=88&bold=true`}
                                                                alt={student.name}
                                                                style={styles.avatar}
                                                            />
                                                            <div>
                                                                <div style={styles.studentName}>{student.name}</div>
                                                                <div style={styles.studentEmail}>{student.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                            {statusOptions.map((opt) => {
                                                                const isActive = attendanceData[student.id]?.status === opt.value;
                                                                return (
                                                                    <button
                                                                        key={opt.value}
                                                                        onClick={() => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], status: opt.value } }))}
                                                                        style={styles.statusBtn(isActive, opt)}
                                                                        title={opt.label}
                                                                    >
                                                                        {opt.icon}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <input
                                                            type="text"
                                                            value={attendanceData[student.id]?.notes || ''}
                                                            onChange={(e) => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], notes: e.target.value } }))}
                                                            placeholder={attendanceData[student.id]?.status !== 'hadir' ? 'Tulis keterangan...' : '-'}
                                                            disabled={attendanceData[student.id]?.status === 'hadir'}
                                                            style={{ ...styles.notesInput, opacity: attendanceData[student.id]?.status === 'hadir' ? 0.5 : 1 }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Nama Siswa</th>
                                                <th style={{ ...styles.th, textAlign: 'center', color: '#16a34a' }}>✅ Hadir</th>
                                                <th style={{ ...styles.th, textAlign: 'center', color: '#2563eb' }}>📝 Izin</th>
                                                <th style={{ ...styles.th, textAlign: 'center', color: '#d97706' }}>🏥 Sakit</th>
                                                <th style={{ ...styles.th, textAlign: 'center', color: '#dc2626' }}>❌ Alfa</th>
                                                <th style={{ ...styles.th, textAlign: 'center' }}>Persentase</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summary.length === 0 ? (
                                                <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Belum ada data absensi</td></tr>
                                            ) : summary.map((row, idx) => (
                                                <tr key={row.student_id}>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ display: 'inline-flex', width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', fontWeight: '600', fontSize: '12px', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</span>
                                                            <span style={{ fontWeight: '600', color: '#1f2937' }}>{row.student_name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>{row.hadir}</span></td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ background: '#dbeafe', color: '#2563eb', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>{row.izin}</span></td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>{row.sakit}</span></td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '13px' }}>{row.alfa}</span></td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ width: '80px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${row.percentage}%`, height: '100%', background: row.percentage >= 80 ? '#22c55e' : row.percentage >= 60 ? '#f59e0b' : '#ef4444', borderRadius: '4px', transition: 'width 0.3s' }}></div>
                                                            </div>
                                                            <span style={{ fontWeight: '700', fontSize: '13px', color: row.percentage >= 80 ? '#16a34a' : row.percentage >= 60 ? '#d97706' : '#dc2626' }}>{row.percentage}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Attendance;
