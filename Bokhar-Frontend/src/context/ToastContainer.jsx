import { useToast } from "./ToastContext";

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg text-white text-sm
            animate-fade-in-up
            ${
              t.type === "success"
                ? "bg-green-500"
                : t.type === "error"
                ? "bg-red-500"
                : t.type === "warning"
                ? "bg-yellow-500"
                : "bg-blue-500"
            }
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
