import { useEffect, useState, useCallback } from "react";
import MobileModal from "./MobileModal";
import DesktopModal from "./DesktopModal";

export default function BaseModal({
  isOpen,
  onClose,
  children,
  maxWidth = "md",
  title,
}) {
  /* ---------------- Detect mobile ---------------- */
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ---------------- Mobile Back button handling ---------------- */
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    // ثبت state مودال
    window.history.pushState({ modal: true }, "");

    const onPopState = () => {
      onClose();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isMobile, isOpen, onClose]);

  /* ---------------- Unified close handler ---------------- */
  const handleClose = useCallback(() => {
    if (isMobile && window.history.state?.modal) {
      window.history.back(); // باعث trigger شدن popstate میشه
    } else {
      onClose();
    }
  }, [isMobile, onClose]);

  if (!isOpen) return null;

  /* ---------------- Mobile → Bottom Sheet ---------------- */
  if (isMobile) {
    return (
      <MobileModal isOpen={isOpen} onClose={handleClose} title={title}>
        {children}
      </MobileModal>
    );
  }

  /* ---------------- Desktop → Center Modal ---------------- */
  return (
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      title={title}
    >
      {children}
    </DesktopModal>
  );
}
