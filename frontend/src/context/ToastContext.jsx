import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }) {
  const icons = {
    critical: '🚨',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️',
    payment: '💰',
    checkin: '🏋️',
  };

  const colors = {
    critical: 'border-red-500/50 bg-red-950/80',
    warning: 'border-amber-500/50 bg-amber-950/80',
    success: 'border-green-500/50 bg-green-950/80',
    info: 'border-blue-500/50 bg-blue-950/80',
    payment: 'border-orange-500/50 bg-orange-950/80',
    checkin: 'border-purple-500/50 bg-purple-950/80',
  };

  return (
    <div
      className={`toast-enter pointer-events-auto glass border rounded-lg px-4 py-3 flex items-start gap-3 cursor-pointer ${colors[toast.type] || colors.info}`}
      style={{ backdropFilter: 'blur(16px)' }}
      onClick={onRemove}
    >
      <span className="text-lg flex-shrink-0">{icons[toast.type] || icons.info}</span>
      <div className="flex-1 min-w-0">
        {toast.title && <div className="font-semibold text-sm text-white">{toast.title}</div>}
        <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</div>
      </div>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
