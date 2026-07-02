import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export const timeSlots = ["۸ صبح تا ۱۳", "۱۶ تا ۲۰"];

// کامپوننت اسکرولر افقی با قابلیت اسکرول با چرخ موس
function HorizontalScroller({ 
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

export default function TimeSelector({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  minDate,
  disabledTimeSlots = [],
  disabledDates = [],
  isLoading = false,
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const prevMinDateRef = useRef(null);

  const toDateObj = useCallback((date) => {
    if (!date) return null;
    return date instanceof DateObject
      ? date
      : new DateObject({ date, calendar: persian, locale: persian_fa });
  }, []);

  const baseDate = useMemo(() => {
    return minDate
      ? toDateObj(minDate)
      : new DateObject({ calendar: persian, locale: persian_fa });
  }, [minDate, toDateObj]);

  useEffect(() => {
    const currentKey = minDate 
      ? (minDate instanceof DateObject 
          ? minDate.toJulianDay() 
          : new DateObject({ date: minDate, calendar: persian }).toJulianDay())
      : null;
    
    if (currentKey !== prevMinDateRef.current) {
      prevMinDateRef.current = currentKey;
      setWeekOffset(0);
    }
  }, [minDate]);

  useEffect(() => {
    if (isLoading) {
      setIsAnimating(true);
    } else {
      const t = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(t);
    }
  }, [isLoading, weekOffset]);

  const days = useMemo(() => {
    const result = [];
    let i = 0;
    let added = 0;

    while (added < 7) {
      const day = new DateObject(baseDate).add(weekOffset * 7 + i, "days");
      if (day.weekDay.index !== 6) {
        result.push(day);
        added++;
      }
      i++;
    }
    return result;
  }, [baseDate, weekOffset]);

  const minDateObj = useMemo(() => {
    return minDate ? toDateObj(minDate) : null;
  }, [minDate, toDateObj]);

  const selectedDateKey = useMemo(() => {
    if (!selectedDate) return null;
    return toDateObj(selectedDate)?.format("YYYY/MM/DD");
  }, [selectedDate, toDateObj]);

  const isDateDisabled = useCallback((dateObj) => {
    if (!disabledDates || !Array.isArray(disabledDates) || disabledDates.length === 0) {
      return false;
    }
    
    const gregorianDate = dateObj.convert("gregorian").format("YYYY-MM-DD");
    const persianDate = dateObj.format("YYYY/MM/DD");
    
    return disabledDates.some(d => {
      if (typeof d !== 'string') return false;
      const normalized = d.trim();
      return normalized === gregorianDate || normalized === persianDate;
    });
  }, [disabledDates]);

  const handlePrevWeek = useCallback(() => {
    setWeekOffset((p) => Math.max(0, p - 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((p) => p + 1);
  }, []);

  const handleDateSelect = useCallback((day) => {
    if (minDateObj && day.toJulianDay() < minDateObj.toJulianDay()) {
      return;
    }
    
    if (isDateDisabled(day)) {
      console.log("🚫 Date is disabled by admin:", day.format("YYYY-MM-DD"));
      return;
    }
    
    const currentKey = selectedDate ? toDateObj(selectedDate)?.format("YYYY/MM/DD") : null;
    if (currentKey === day.format("YYYY/MM/DD")) {
      return;
    }
    
    setSelectedDate(day);
  }, [minDateObj, selectedDate, setSelectedDate, toDateObj, isDateDisabled]);

  const handleTimeSelect = useCallback((slot) => {
    if (selectedTime === slot) return;
    if (disabledTimeSlots.includes(slot)) return;
    setSelectedTime(slot);
  }, [selectedTime, setSelectedTime, disabledTimeSlots]);

  return (
    <div>
      {/* navigator */}
      <div className="flex justify-between items-center mb-3">
        <button
          disabled={weekOffset === 0}
          onClick={handlePrevWeek}
          className="text-pink-500 disabled:text-gray-300 transition-colors font-medium text-sm sm:text-base"
        >
          → هفته قبل
        </button>

        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">
          هفته {weekOffset + 1}
        </span>

        <button
          onClick={handleNextWeek}
          className="text-pink-500 transition-colors font-medium text-sm sm:text-base"
        >
          هفته بعد ←
        </button>
      </div>

      {/* Days - با استفاده از HorizontalScroller برای دسکتاپ و موبایل */}
      <HorizontalScroller 
        className="pb-1.5 sm:pb-2 snap-x snap-mandatory" 
        innerClassName="gap-1.5 sm:gap-2"
      >
        {isAnimating
          ? Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-16 sm:h-[5.5rem] sm:w-[4.5rem] bg-pink-100/60 dark:bg-[#262B40]/40 animate-pulse rounded-xl flex-shrink-0 snap-start"
              />
            ))
          : days.map((day) => {
              const isBeforeMin = minDateObj && day.toJulianDay() < minDateObj.toJulianDay();
              const isDisabled = isDateDisabled(day);
              const isSelected = selectedDateKey === day.format("YYYY/MM/DD");

              return (
                <div
                  key={day.toJulianDay()}
                  onClick={() => handleDateSelect(day)}
                  className={`
                    w-16 h-20 sm:w-[4.5rem] sm:h-[5.5rem] rounded-2xl border flex flex-col justify-center items-center text-center 
                    transition-all duration-300 flex-shrink-0 snap-start select-none relative
                    ${
                      isBeforeMin || isDisabled
                        ? "opacity-40 cursor-not-allowed bg-gray-100 dark:bg-[#262B40] border-gray-200 dark:border-gray-700"
                        : isSelected
                        ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] border-gray-300 dark:border-[#8AA1C4] text-gray-800 dark:text-white shadow-md shadow-[#8AA1C4]/30 scale-105 font-bold z-10"
                        : "bg-white dark:bg-[#262B40] border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-sky-100 dark:hover:bg-[#2d3350] shadow-sm cursor-pointer font-bold"
                    }
                  `}
                >
                  {isDisabled && (
                    <>
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse" />
                      <div className="absolute inset-0 bg-red-500/5 pointer-events-none rounded-2xl" />
                    </>
                  )}
                  
                  <p className="text-xs sm:text-sm font-medium text-pink-500">
                    {day.weekDay.name}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold leading-tight">
                    {day.day}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                    {day.month.name}
                  </p>
                </div>
              );
            })}
      </HorizontalScroller>

      {/* Time Slots */}
      {selectedDate && (
        <div className="mt-4 flex justify-center gap-2 sm:gap-3 flex-wrap animate-fadeInUp">
          {timeSlots.map((slot) => {
            const isDisabled = disabledTimeSlots.includes(slot);
            return (
              <button
                key={slot}
                onClick={() => handleTimeSelect(slot)}
                disabled={isDisabled}
                className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-xs sm:text-sm border transition-all duration-300 font-bold
                  ${
                    isDisabled
                      ? "bg-gray-100 dark:bg-[#262B40] text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50"
                      : selectedTime === slot
                      ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] border-gray-300 dark:border-[#8AA1C4] text-gray-800 dark:text-white shadow-md shadow-[#8AA1C4]/30 scale-105"
                      : "bg-white dark:bg-[#262B40] border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-sky-100 dark:hover:bg-[#2d3350] shadow-sm"
                  }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
      
      {selectedDate && disabledTimeSlots.length > 0 && disabledTimeSlots.length < timeSlots.length && (
        <p className="mt-2 text-[10px] sm:text-xs text-center text-amber-600 dark:text-amber-400 px-2">
          * برای تحویل فوری (۲۴ ساعته) در همان روز، فقط بازه زمانی متفاوت قابل انتخاب است
        </p>
      )}
    </div>
  );
}