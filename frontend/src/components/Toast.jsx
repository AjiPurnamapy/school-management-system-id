import { useToast } from '../contexts/ToastContext';
import '../styles/Toast.css';

// Icon untuk setiap tipe toast
const ToastIcon = ({ type }) => {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return <span className="toast-icon">{icons[type] || icons.info}</span>;
};

// Komponen Toast tunggal
const ToastItem = ({ toast, onClose }) => {
    return (
        <div className={`toast-item toast-${toast.type}`}>
            <ToastIcon type={toast.type} />
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => onClose(toast.id)}>
                ×
            </button>
        </div>
    );
};

// Container untuk semua toast (ditempatkan di pojok kanan atas)
const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <ToastItem 
                    key={toast.id} 
                    toast={toast} 
                    onClose={removeToast} 
                />
            ))}
        </div>
    );
};

export default ToastContainer;
