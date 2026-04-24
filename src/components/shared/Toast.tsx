import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastItem = { id: number; text: string; type: "success" | "error" | "info" };

let pushFn: ((t: Omit<ToastItem, "id">) => void) | null = null;

export function toast(text: string, type: ToastItem["type"] = "success") {
  pushFn?.({ text, type });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    pushFn = (t) => {
      const id = Date.now() + Math.random();
      setItems((cur) => [...cur, { ...t, id }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 3000);
    };
    return () => {
      pushFn = null;
    };
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-card border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 min-w-[280px] animate-fade-in"
        >
          {t.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          ) : t.type === "error" ? (
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          )}
          <span className="text-sm text-foreground flex-1">{t.text}</span>
          <button
            onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] bg-foreground/40 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-border flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
