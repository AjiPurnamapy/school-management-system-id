import { createContext, useContext, useState, useCallback } from 'react';
import '../styles/ConfirmModal.css';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm harus digunakan di dalam ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: 'Konfirmasi',
        message: 'Apakah Anda yakin?',
        onConfirm: () => {},
        onCancel: () => {},
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger' // 'danger' | 'warning' | 'info'
    });

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfig({
                title: options.title || 'Konfirmasi',
                message: options.message || 'Apakah Anda yakin?',
                confirmText: options.confirmText || 'Ya, Lanjutkan',
                cancelText: options.cancelText || 'Batal',
                type: options.type || 'danger',
                onConfirm: () => {
                    setIsOpen(false);
                    resolve(true);
                },
                onCancel: () => {
                    setIsOpen(false);
                    resolve(false);
                }
            });
            setIsOpen(true);
        });
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="confirm-overlay" onClick={config.onCancel}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className={`confirm-icon confirm-icon-${config.type}`}>
                            {config.type === 'danger' && '🗑️'}
                            {config.type === 'warning' && '⚠️'}
                            {config.type === 'info' && 'ℹ️'}
                        </div>
                        <h3 className="confirm-title">{config.title}</h3>
                        <p className="confirm-message">{config.message}</p>
                        <div className="confirm-buttons">
                            <button 
                                className="confirm-btn confirm-btn-cancel" 
                                onClick={config.onCancel}
                            >
                                {config.cancelText}
                            </button>
                            <button 
                                className={`confirm-btn confirm-btn-${config.type}`}
                                onClick={config.onConfirm}
                            >
                                {config.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export default ConfirmContext;
