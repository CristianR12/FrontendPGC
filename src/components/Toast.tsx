// src/components/Toast.tsx
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

/**
 * Componente Toast para notificaciones
 * Se cierra automáticamente después de 'duration' ms
 */
export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: { bg: '#4CAF50', icon: '✅' },
    error: { bg: '#f44336', icon: '❌' },
    info: { bg: '#2196F3', icon: 'ℹ️' }
  };

  const { bg, icon } = colors[type];

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: bg,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease-out',
      minWidth: '300px',
      maxWidth: '500px'
    }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '1rem' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.3)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}
      >
        ×
      </button>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}