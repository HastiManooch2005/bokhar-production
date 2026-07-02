import { useEffect } from "react";
import ReactDOM from "react-dom";

export default function DesktopModal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = "md",
}) {
  const portalRoot = document.getElementById("modal-root");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  if (!portalRoot || !isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div
      dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className={`
          rounded-3xl shadow-xl w-full
          bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 
          dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          ${maxWidth === "sm" ? "max-w-sm" : ""}
          ${maxWidth === "md" ? "max-w-md" : ""}
          ${maxWidth === "lg" ? "max-w-lg" : ""}
        `}
      >
        {title && (
          <div className="px-6 pt-5 pb-2 font-semibold dark:text-gray-200">{title}</div>
        )}

        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>,
    portalRoot
  );
}