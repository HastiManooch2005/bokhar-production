import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimeSelector, { timeSlots } from "./TimeSelector";
import { capacityApi } from "../../../api/capacityApi"; 

export default function DateTimeRangePicker({
  value,
  onChange,
  onComplete,
  onGoLocation,
}) {
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState(null);
  const [pickupDate, setPickupDate] = useState(null);
  const [pickupTime, setPickupTime] = useState(null);
  
  // ✅ استیت‌های API
  const [rushSettings, setRushSettings] = useState({
    fee_24h: 100000,
    fee_48h: 50000,
    free_after_hours: 72,
    is_24h_enabled: true,
    is_48h_enabled: true
  });
  const [disabledDates, setDisabledDates] = useState([]); 
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  const hasNotifiedRef = useRef(false);
  const prevValueRef = useRef(null);

  /* ---------- لود تنظیمات از API ---------- */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingSettings(true);
        setLoadError(null);
        
        const [rushRes, templateRes] = await Promise.all([
          capacityApi.getRushFeeSettings(),
          capacityApi.getDeliveryTemplates()
        ]);

        console.log("📦 API Response - Rush:", rushRes.data);
        console.log("📦 API Response - Templates:", templateRes.data);

        if (rushRes.data) {
          setRushSettings({
            fee_24h: rushRes.data.fee_24h || 100000,
            fee_48h: rushRes.data.fee_48h || 50000,
            free_after_hours: rushRes.data.free_after_hours || 72,
            is_24h_enabled: rushRes.data.is_24h_enabled !== false,
            is_48h_enabled: rushRes.data.is_48h_enabled !== false
          });
        }

        // ✅ فیکس اصلی: استخراج درست disabled_dates از آرایه JSONField
        if (templateRes.data && Array.isArray(templateRes.data)) {
          // جمع‌آوری همه تاریخ‌های غیرفعال از همه تمپلیت‌های فعال
          const allDisabledDates = templateRes.data
            .filter(t => t.is_active !== false) // فقط تمپلیت‌های فعال
            .flatMap(t => {
              // اطمینان از اینکه disabled_dates آرایه است و خالی نیست
              if (Array.isArray(t.disabled_dates) && t.disabled_dates.length > 0) {
                return t.disabled_dates;
              }
              return [];
            });
          
          // حذف تاریخ‌های تکراری
          const uniqueDates = [...new Set(allDisabledDates)];
          
          console.log("📅 Disabled dates extracted:", uniqueDates);
          setDisabledDates(uniqueDates);
        } else {
          console.warn("⚠️ No templates found or invalid format");
          setDisabledDates([]);
        }
        
      } catch (error) {
        console.error("❌ Error loading capacity settings:", error);
        setLoadError("خطا در بارگذاری تنظیمات. لطفاً صفحه را رفرش کنید.");
        // مقدار پیش‌فرض در صورت خطا
        setDisabledDates([]);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  /* ---------- init value ---------- */
  useEffect(() => {
    if (!value || value === prevValueRef.current) return;
    prevValueRef.current = value;
    
    try {
      if (value.delivery?.date) {
        const newDate = new DateObject({
          date: value.delivery.date,
          calendar: persian,
          locale: persian_fa,
        });
        setDeliveryDate(prev => {
          if (!prev) return newDate;
          return prev.toJulianDay() !== newDate.toJulianDay() ? newDate : prev;
        });
      }
      if (value.pickup?.date) {
        const newDate = new DateObject({
          date: value.pickup.date,
          calendar: persian,
          locale: persian_fa,
        });
        setPickupDate(prev => {
          if (!prev) return newDate;
          return prev.toJulianDay() !== newDate.toJulianDay() ? newDate : prev;
        });
      }
      if (value.delivery?.time) {
        setDeliveryTime(prev => prev !== value.delivery.time ? value.delivery.time : prev);
      }
      if (value.pickup?.time) {
        setPickupTime(prev => prev !== value.pickup.time ? value.pickup.time : prev);
      }
    } catch (e) {
      console.warn("❌ خطا در مقداردهی اولیه:", e);
    }
  }, [value]);

  /* ---------- محاسبه اختلاف ساعت ---------- */
  const calculateHoursDiff = useCallback(() => {
    if (!deliveryDate || !deliveryTime || !pickupDate || !pickupTime) return 0;
    
    const deliveryObj = new DateObject(deliveryDate);
    const pickupObj = new DateObject(pickupDate);
    const dayDiff = pickupObj.toJulianDay() - deliveryObj.toJulianDay();
    
    const getMidHour = (slot) => {
      if (slot === "۸صبح  تا ۱۳" || slot === "۸ صبح تا ۱۳") return 10.5;
      if (slot === "۱۶ تا ۲۰") return 18;
      return 12;
    };
    
    const deliveryHour = getMidHour(deliveryTime);
    const pickupHour = getMidHour(pickupTime);
    
    let totalHours = (dayDiff * 24) + (pickupHour - deliveryHour);
    return Math.max(0, totalHours);
  }, [deliveryDate, deliveryTime, pickupDate, pickupTime]);

  /* ---------- pricing logic ---------- */
  const priceInfo = useMemo(() => {
    const hours = calculateHoursDiff();
    
    if (hours <= 0) return null;
    
    const { fee_24h, fee_48h, free_after_hours, is_24h_enabled, is_48h_enabled } = rushSettings;
    
    if (hours <= 24 && is_24h_enabled) {
      return {
        amount: fee_24h,
        type: 'express',
        label: `${fee_24h.toLocaleString('fa-IR')} تومان`,
        desc: 'سرویس فوری (تا 24 ساعت)',
        color: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-300',
        hours: hours
      };
    }
    
    if (hours <= 48 && is_48h_enabled) {
      return {
        amount: fee_48h,
        type: 'standard',
        label: `${fee_48h.toLocaleString('fa-IR')} تومان`,
        desc: 'سرویس استاندارد (تا 48 ساعت)',
        color: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        textColor: 'text-amber-700 dark:text-amber-300',
        hours: hours
      };
    }
    
    return {
      amount: 0,
      type: 'economy',
      label: 'رایگان',
      desc: `سرویس اقتصادی (${free_after_hours}+ ساعت)`,
      color: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      hours: hours
    };
  }, [calculateHoursDiff, rushSettings]);

  const pickupMinDate = deliveryDate ? new DateObject(deliveryDate) : null;

  /* ---------- محاسبه اسلات‌های غیرفعال ---------- */
  const disabledPickupSlots = useMemo(() => {
    if (!deliveryDate || !pickupDate || !deliveryTime) return [];
    
    const deliveryObj = new DateObject(deliveryDate);
    const pickupObj = new DateObject(pickupDate);
    
    if (deliveryObj.toJulianDay() === pickupObj.toJulianDay()) {
      if (deliveryTime === "۸ صبح تا ۱۳") {
        return ["۸ صبح تا ۱۳"];
      }
      if (deliveryTime === "۱۶ تا ۲۰") {
        return ["۸ صبح تا ۱۳", "۱۶ تا ۲۰"];
      }
    }
    
    return [];
  }, [deliveryDate, pickupDate, deliveryTime]);

  const triggerOnChange = useCallback((state = {}, currentPrice = priceInfo) => {
    if (!onChange) return;

    const dDate = state.deliveryDate ?? deliveryDate;
    const pDate = state.pickupDate ?? pickupDate;

    onChange({
      delivery: {
        date: dDate ? new DateObject(dDate).format("YYYY-MM-DD") : null,
        time: state.deliveryTime ?? deliveryTime ?? null,
      },
      pickup: {
        date: pDate ? new DateObject(pDate).format("YYYY-MM-DD") : null,
        time: state.pickupTime ?? pickupTime ?? null,
      },
      pricing: currentPrice ? {
        amount: currentPrice.amount,
        type: currentPrice.type,
        hours: currentPrice.hours
      } : null
    });
  }, [onChange, deliveryDate, pickupDate, deliveryTime, pickupTime, priceInfo]);

  useEffect(() => {
    const isComplete = deliveryDate && deliveryTime && pickupDate && pickupTime;
    
    if (isComplete && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      triggerOnChange();
      onComplete?.();
    } else if (!isComplete) {
      hasNotifiedRef.current = false;
    }
  }, [deliveryDate, deliveryTime, pickupDate, pickupTime, triggerOnChange, onComplete]);

  /* ---------- handlers ---------- */
  const handleDeliveryDateChange = (date) => {
    setDeliveryDate(date);
    
    if (pickupDate) {
      const pickupObj = new DateObject(pickupDate);
      const deliveryObj = new DateObject(date);
      
      if (pickupObj.toJulianDay() < deliveryObj.toJulianDay()) {
        setPickupDate(null);
        setPickupTime(null);
        hasNotifiedRef.current = false;
      } else if (pickupObj.toJulianDay() === deliveryObj.toJulianDay()) {
        if (deliveryTime === "۱۶ تا ۲۰") {
          setPickupDate(null);
          setPickupTime(null);
          hasNotifiedRef.current = false;
        } else if (deliveryTime === "۸ صبح تا ۱۳" && pickupTime === "۸ صبح تا ۱۳") {
          setPickupTime(null);
          hasNotifiedRef.current = false;
        }
      }
    }
    
    triggerOnChange({ deliveryDate: date });
  };

  const handleDeliveryTimeChange = (time) => {
    setDeliveryTime(time);
    
    if (pickupDate && deliveryDate) {
      const deliveryObj = new DateObject(deliveryDate);
      const pickupObj = new DateObject(pickupDate);
      
      if (deliveryObj.toJulianDay() === pickupObj.toJulianDay()) {
        if (time === "۱۶ تا ۲۰") {
          setPickupDate(null);
          setPickupTime(null);
          hasNotifiedRef.current = false;
        } else if (time === "۸ صبح تا ۱۳" && pickupTime === "۸ صبح تا ۱۳") {
          setPickupTime(null);
          hasNotifiedRef.current = false;
        }
      }
    }
    
    triggerOnChange({ deliveryTime: time });
  };

  const handlePickupDateChange = (date) => {
    setPickupDate(date);
    
    if (deliveryDate && deliveryTime) {
      const deliveryObj = new DateObject(deliveryDate);
      const pickupObj = new DateObject(date);
      
      if (pickupObj.toJulianDay() === deliveryObj.toJulianDay()) {
        if (deliveryTime === "۱۶ تا ۲۰") {
          setPickupTime(null);
          hasNotifiedRef.current = false;
        } else if (deliveryTime === "۸ صبح تا ۱۳" && pickupTime === "۸ صبح تا ۱۳") {
          setPickupTime(null);
          hasNotifiedRef.current = false;
        }
      }
    }
    
    triggerOnChange({ pickupDate: date });
  };

  const handlePickupTimeChange = (time) => {
    setPickupTime(time);
    triggerOnChange({ pickupTime: time });
  };

  const formatSafe = (date) => {
    if (!date) return "";
    try {
      return date.format("dddd DD MMMM");
    } catch {
      return "";
    }
  };

  const isComplete = deliveryDate && deliveryTime && pickupDate && pickupTime;

  if (loadError) {
    return (
      <div className="w-full max-w-3xl mx-auto p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
        <p className="mb-4">{loadError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="w-full max-w-3xl mx-auto rounded-3xl mb-15 md:mb-0 p-4 md:p-8 shadow-xl border bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
    >
      {isLoadingSettings && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm text-center animate-pulse">
          در حال دریافت تنظیمات ظرفیت...
        </div>
      )}
      
      <h2 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent">
        انتخاب بازه زمانی تحویل و دریافت
      </h2>
      <p className="my-4 text-center text-xs text-gray-500 dark:text-gray-400">
        * {rushSettings.is_24h_enabled ? `تحویل فوری (۲۴ ساعته): ${rushSettings.fee_24h?.toLocaleString('fa-IR')} تومان` : 'سرویس ۲۴ ساعته غیرفعال است'} | 
        {rushSettings.is_48h_enabled ? ` ۴۸ ساعته: ${rushSettings.fee_48h?.toLocaleString('fa-IR')} تومان` : ' سرویس ۴۸ ساعته غیرفعال است'} | 
        {rushSettings.free_after_hours}+ ساعت: رایگان
      </p>
      
{/* ✅ تغییر اصلی: items-stretch برای یکسان کردن ارتفاع */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
  {/* Delivery Section */}
  {/* ✅ حذف h-fit و اضافه کردن h-full flex flex-col */}
  <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full">
    {/* ✅ min-h-[48px] برای ثابت نگه داشتن ارتفاع header */}
    <div className="flex items-center gap-2 mb-4 min-h-[48px]">
      <span className="text-2xl">📦</span>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
        تحویل دادن
      </h3>
      {deliveryDate && deliveryTime && (
        <span className="mr-auto text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full flex items-center gap-2 whitespace-nowrap">
          <span className="font-medium">{formatSafe(deliveryDate)}</span>
          <span className="opacity-60">|</span>
          <span>{deliveryTime}</span>
        </span>
      )}
    </div>
    {/* ✅ flex-1 برای پر کردن فضای باقیمانده */}
    <div className="flex-1">
      <TimeSelector
        selectedDate={deliveryDate}
        setSelectedDate={handleDeliveryDateChange}
        selectedTime={deliveryTime}
        setSelectedTime={handleDeliveryTimeChange}
        disabledDates={disabledDates}
        isLoading={isLoadingSettings}
      />
    </div>
  </div>

  {/* Pickup Section */}
  <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full">
    <div className="flex items-center gap-2 mb-4 min-h-[48px]">
      <span className="text-2xl">🕒</span>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
        تحویل گرفتن
      </h3>
      {pickupDate && pickupTime && (
        <span className="mr-auto text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full flex items-center gap-2 whitespace-nowrap">
          <span className="font-medium">{formatSafe(pickupDate)}</span>
          <span className="opacity-60">|</span>
          <span>{pickupTime}</span>
        </span>
      )}
    </div>
    <div className="flex-1">
      <TimeSelector
        selectedDate={pickupDate}
        setSelectedDate={handlePickupDateChange}
        selectedTime={pickupTime}
        setSelectedTime={handlePickupTimeChange}
        minDate={pickupMinDate}
        disabledTimeSlots={disabledPickupSlots}
        disabledDates={disabledDates}
        isLoading={isLoadingSettings}
      />
    </div>
  </div>
</div>


      {/* Pricing Summary */}
      {isComplete && priceInfo && (
        <div className={`mt-8 p-6 rounded-2xl border-2 ${priceInfo.borderColor} bg-gradient-to-r ${priceInfo.color} animate-fadeInUp`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center md:text-right">
              <h4 className={`font-bold text-lg ${priceInfo.textColor} mb-1`}>
                هزینه سرویس
              </h4>
              <p className={`text-sm ${priceInfo.textColor} opacity-90`}>
                {priceInfo.desc} ({Math.round(priceInfo.hours)} ساعت)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-black ${priceInfo.textColor}`}>
                {priceInfo.label}
              </span>
              {priceInfo.amount === 0 && (
                <span className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded font-bold">
                  تخفیف ویژه
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-400/20 grid grid-cols-3 gap-2 text-center text-xs">
            <div className={`p-3 rounded-xl transition-all ${priceInfo.type === 'express' ? 'bg-white/50 dark:bg-white/20 font-bold shadow-sm' : 'bg-white/20 opacity-60'}`}>
              <div className="font-bold mb-1 text-red-700 dark:text-red-300">۲۴ ساعته</div>
              <div className="font-black text-lg">{rushSettings.fee_24h?.toLocaleString('fa-IR') || '۱۰۰,۰۰۰'}</div>
              <div className="text-[10px] opacity-75">{rushSettings.is_24h_enabled ? 'سریع‌ترین' : 'غیرفعال'}</div>
            </div>
            <div className={`p-3 rounded-xl transition-all ${priceInfo.type === 'standard' ? 'bg-white/50 dark:bg-white/20 font-bold shadow-sm' : 'bg-white/20 opacity-60'}`}>
              <div className="font-bold mb-1 text-amber-700 dark:text-amber-300">۴۸ ساعته</div>
              <div className="font-black text-lg">{rushSettings.fee_48h?.toLocaleString('fa-IR') || '۵۰,۰۰۰'}</div>
              <div className="text-[10px] opacity-75">{rushSettings.is_48h_enabled ? 'سریع' : 'غیرفعال'}</div>
            </div>
            <div className={`p-3 rounded-xl transition-all ${priceInfo.type === 'economy' ? 'bg-white/50 dark:bg-white/20 font-bold shadow-sm' : 'bg-white/20 opacity-60'}`}>
              <div className="font-bold mb-1 text-emerald-700 dark:text-emerald-300">{rushSettings.free_after_hours || '۷۲'}+ ساعت</div>
              <div className="font-black text-lg">رایگان</div>
              <div className="text-[10px] opacity-75">عادی</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-8 flex justify-center">
        <button
          disabled={!isComplete}
          onClick={() => onGoLocation?.()}
          className={`
            w-full md:w-auto px-4 py-2 md:px-8 md:py-4 rounded-2xl font-bold text-lg transition-all transform
            ${isComplete
              ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg hover:shadow-xl cursor-pointer"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {isComplete ? "تایید زمان تحویل " : "لطفاً تاریخ و زمان را انتخاب کنید"}
        </button>
      </div>
    </div>
  );
}
