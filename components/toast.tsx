"use client";

import { useEffect, useState, useCallback } from "react";

export interface ToastMessage {
  id: string;
  text: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

export function showToast(msg: Omit<ToastMessage, "id">) {
  const id = `toast-${Date.now()}`;
  const full = { ...msg, id };
  toastListeners.forEach(fn => fn(full));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => {
      setToasts(prev => [...prev, msg]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== msg.id));
      }, msg.duration || 5000);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(fn => fn !== listener); };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
      display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "380px"
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.75rem 1rem", backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)", fontSize: "0.85rem",
          animation: "slideUp 0.2s ease"
        }}>
          <span style={{ flex: 1 }}>{t.text}</span>
          {t.action && (
            <button
              className="btn btn-ghost"
              style={{ color: "var(--brand-accent)", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}
              onClick={() => { t.action!.onClick(); dismiss(t.id); }}
            >
              {t.action.label}
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: 0, fontSize: "1rem", lineHeight: 1, opacity: 0.5 }} onClick={() => dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
