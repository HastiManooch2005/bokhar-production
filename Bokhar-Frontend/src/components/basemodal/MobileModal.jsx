import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

const OPEN_TRANSITION = "transform 0.65s cubic-bezier(0.16,1,0.3,1)";
const CLOSE_TRANSITION = "transform 0.55s cubic-bezier(0.4,0,0.2,1)";
const BACKDROP_OPEN = "opacity 0.55s ease-out";
const BACKDROP_CLOSE = "opacity 0.35s ease-in";

export default function MobileModal({ isOpen, onClose, children, title }) {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);

  const startY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const startScroll = useRef(0);
  const mode = useRef(null);
  const dragDistance = useRef(0);

  const [mounted, setMounted] = useState(false);
  const portalRoot = document.getElementById("modal-root");

  /* ---------------- Mount after isOpen ---------------- */
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(id);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  /* ---------------- Body scroll lock ---------------- */
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [mounted]);

  /* ---------------- Init ---------------- */
  useEffect(() => {
    if (!modalRef.current) return;
    modalRef.current.style.willChange = "transform";
    modalRef.current.style.transform = "translateY(100%)";
    modalRef.current.style.transition = "none";

    if (backdropRef.current) {
      backdropRef.current.style.opacity = "0";
      backdropRef.current.style.transition = "none";
    }
  }, []);

  /* ---------------- Open ---------------- */
  useEffect(() => {
    if (!isOpen || !mounted || !modalRef.current) return;

    modalRef.current.style.transition = OPEN_TRANSITION;
    if (backdropRef.current) backdropRef.current.style.transition = BACKDROP_OPEN;

    const id = requestAnimationFrame(() => {
      modalRef.current.style.transform = "translateY(0)";
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
    });

    return () => cancelAnimationFrame(id);
  }, [isOpen, mounted]);

  /* ---------------- Close ---------------- */
  const closeWithAnim = () => {
    if (!modalRef.current || !backdropRef.current) return;

    modalRef.current.style.transition = CLOSE_TRANSITION;
    backdropRef.current.style.transition = BACKDROP_CLOSE;

    modalRef.current.style.transform = `translateY(${window.innerHeight}px)`;
    backdropRef.current.style.opacity = "0";

    setTimeout(() => {
      onClose();
      setMounted(false);
    }, 420);
  };

  /* ---------------- Drag helpers ---------------- */
  const setTranslate = (y) => {
    dragDistance.current = y;
    if (!modalRef.current || !backdropRef.current) return;

    modalRef.current.style.transform = `translateY(${y}px)`;
    backdropRef.current.style.opacity = `${1 - y / window.innerHeight}`;
  };

  /* ---------------- Touch events ---------------- */
  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    lastY.current = startY.current;
    lastTime.current = performance.now();
    velocity.current = 0;
    startScroll.current = contentRef.current.scrollTop;
    mode.current = null;
    dragDistance.current = 0;

    if (modalRef.current && backdropRef.current) {
      modalRef.current.style.transition = "none";
      backdropRef.current.style.transition = "none";
    }
  };

  const onTouchMove = (e) => {
    const y = e.touches[0].clientY;
    const diff = y - startY.current;

    if (!mode.current) {
      if (Math.abs(diff) < 6) return;
      mode.current = diff > 0 && startScroll.current <= 0 ? "drag" : "scroll";
    }

    if (mode.current === "drag") {
      e.preventDefault();
      const resistance = diff > 0 ? diff * 0.45 : diff * 0.2;
      setTranslate(Math.max(0, resistance));

      const now = performance.now();
      velocity.current = (y - lastY.current) / (now - lastTime.current);
      lastY.current = y;
      lastTime.current = now;
    }
  };

  const onTouchEnd = () => {
    if (mode.current !== "drag") return;

    modalRef.current.style.transition = CLOSE_TRANSITION;
    backdropRef.current.style.transition = BACKDROP_CLOSE;

    const shouldClose =
      velocity.current > 0.7 ||
      dragDistance.current > window.innerHeight * 0.25;

    if (shouldClose) {
      closeWithAnim();
    } else {
      setTranslate(0);
    }

    mode.current = null;
  };

  if (!portalRoot || (!mounted && !isOpen)) return null;

  return ReactDOM.createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[200] bg-black/40 dark:bg-black/60"
      onClick={closeWithAnim}
    >
      <div
        dir="rtl"
        ref={modalRef}
        className="
          absolute bottom-0 w-full rounded-t-[32px]
          bg-gradient-to-br
          from-sky-50 via-sky-100 to-sky-200
          dark:from-sky-800 dark:via-sky-900 dark:to-sky-950
        "
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
        </div>

        {title && (
          <div className="px-6 pb-2 font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </div>
        )}

        <div
          ref={contentRef}
          className="px-6 pb-6 max-h-[75vh] overflow-y-auto text-gray-900 dark:text-gray-100"
        >
          {children}
        </div>
      </div>
    </div>,
    portalRoot
  );
}
