import { useRef, useState } from "react";

export default function useDragToggle(optionCount, onSelect) {
  const wrapperRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(null);

  const start = () => setDragging(true);

  const move = (clientX) => {
    if (!dragging || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;

    if (x < 0) x = 0;
    if (x > 100) x = 100;

    setDragX(x);
  };

  const end = () => {
    if (!dragging || dragX == null) {
      setDragging(false);
      return;
    }

    const segmentWidth = 100 / optionCount;
    const index = Math.floor(dragX / segmentWidth);

    onSelect(index);

    setDragging(false);
    setDragX(null);
  };

  return {
    wrapperRef,
    dragX,
    bindEvents: {
      onMouseDown: start,
      onMouseMove: e => move(e.clientX),
      onMouseUp: end,
      onMouseLeave: end,

      onTouchStart: start,
      onTouchMove: e => move(e.touches[0].clientX),
      onTouchEnd: end,
    }
  };
}
