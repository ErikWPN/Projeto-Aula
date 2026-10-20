import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(mensagem: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const mostrar = useCallback((texto: string) => {
    setMensagem(texto);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMensagem(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {mensagem}
      </div>
      {mensagem && (
        <div className="toast" aria-hidden="true">
          {mensagem}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
