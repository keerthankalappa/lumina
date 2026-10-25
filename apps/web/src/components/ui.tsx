import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export function Icon({ name, fill = false, className = "", size }: { name: string; fill?: boolean; className?: string; size?: number }) {
  return (
    <span aria-hidden="true" className={`icon ${fill ? "icon-fill" : ""} ${className}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-tertiary-fixed font-serif font-semibold text-tertiary"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
      {label}…
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-container ${className}`} />;
}

// ---------- Toasts ----------

type Toast = { id: number; message: string; tone: "info" | "success" | "error" };
const ToastCtx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`sheet pointer-events-auto flex animate-rise items-center gap-2 rounded-full px-5 py-3 text-label-lg ${
              t.tone === "error" ? "text-error" : t.tone === "success" ? "text-secondary" : "text-on-surface"
            }`}
          >
            <Icon name={t.tone === "error" ? "error" : t.tone === "success" ? "check_circle" : "info"} fill />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function Modal({ open, onClose, label, children, className = "" }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className={`animate-rise ${className}`}>
        {children}
      </div>
    </div>
  );
}
