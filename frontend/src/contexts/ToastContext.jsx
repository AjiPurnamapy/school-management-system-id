import { createContext, useContext, useState, useCallback } from 'react';

// Context untuk Toast
const ToastContext = createContext(null);

// Hook untuk menggunakan Toast
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast harus digunakan di dalam ToastProvider');
    }
    return context;
};

// Provider Component
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // Menambahkan toast baru
    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove setelah duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    }, []);

    // Menghapus toast secara manual
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Shorthand untuk tipe toast
    const toast = {
        success: (msg, duration) => showToast(msg, 'success', duration),
        error: (msg, duration) => showToast(msg, 'error', duration),
        warning: (msg, duration) => showToast(msg, 'warning', duration),
        info: (msg, duration) => showToast(msg, 'info', duration),
    };

    return (
        <ToastContext.Provider value={{ showToast, removeToast, toast, toasts }}>
            {children}
        </ToastContext.Provider>
    );
};

export default ToastContext;
