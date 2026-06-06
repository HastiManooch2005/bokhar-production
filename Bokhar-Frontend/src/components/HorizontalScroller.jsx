import { useRef, useEffect, useState } from "react";

export default function HorizontalScroller({ 
  children, 
  className = "", 
  innerClassName = "" 
}) {
  const scrollRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // تشخیص overflow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    };

    checkOverflow();
    
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);
    
    window.addEventListener('resize', checkOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [children]);

  // مدیریت اسکرول با چرخ موس (فقط وقتی نیاز به اسکرول هست)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isOverflowing) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        e.stopPropagation();
        
        // RTL: چرخ به پایین (deltaY > 0) = اسکرول به راست (مقدار مثبت)
        const delta = e.deltaY > 0 ? 100 : -100;
        
        el.scrollBy({
          left: delta,
          behavior: 'smooth'
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOverflowing]);

  return (
    <div 
      ref={scrollRef} 
      className={`overflow-x-auto scrollbar-hide ${className}`}
    >
      <div className={`flex ${isOverflowing ? 'justify-start' : 'justify-center'} ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
