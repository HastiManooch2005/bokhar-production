import { useState, useEffect } from "react";
import BaseModal from "../../../basemodal/BaseModal";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/layouts/mobile.css";
import { createProductDiscount } from "../../../../api/discountsApi";
import { Tag, Timer, Clock, CalendarDays, AlertCircle, Percent, Banknote, X } from 'lucide-react';

const persianToISO = (persianDate, timeStr) => {
  if (!persianDate) return null;
  try {
    const date = persianDate.toDate();
    const [hours, minutes] = (timeStr || "00:00").split(":");
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toISOString();
  } catch {
    return null;
  }
};

const numberToPersianWords = (num) => {
  if (num === 0) return "صفر";
  
  const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
  const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
  const thousands = ["", "هزار", "میلیون", "میلیارد"];
  
  const toWords = (n) => {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " و " + ones[n % 10] : "");
    if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 !== 0 ? " و " + toWords(n % 100) : "");
    
    let result = "";
    let i = 0;
    while (n > 0) {
      if (n % 1000 !== 0) {
        result = toWords(n % 1000) + " " + thousands[i] + (result ? " و " + result : "");
      }
      n = Math.floor(n / 1000);
      i++;
    }
    return result;
  };
  
  return toWords(num) || "صفر";
};

function DiscountInputs({ value, onChange }) {
  const { percent, amount, activeType } = value;
  const [localActive, setLocalActive] = useState(activeType);

  useEffect(() => {
    setLocalActive(activeType);
  }, [activeType]);

  const handleReset = (e) => {
    e.stopPropagation();
    onChange({ percent: "", amount: "", activeType: null });
    setLocalActive(null);
  };

  const activate = (type) => {
    if (!localActive) {
      setLocalActive(type);
      onChange({ ...value, activeType: type });
    }
  };

  const handlePercentChange = (e) => {
    let v = e.target.value;
    if (v !== "") {
      const num = Number(v);
      if (num < 0) v = "0";
      if (num > 100) v = "100";
    }
    onChange({ ...value, percent: v, activeType: "percent" });
    if (!localActive) setLocalActive("percent");
  };

  const handleAmountChange = (e) => {
    let v = e.target.value;
    if (v !== "" && Number(v) < 0) v = "0";
    onChange({ ...value, amount: v, activeType: "fixed" });
    if (!localActive) setLocalActive("fixed");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-purple-600" />
        <h4 className="text-sm font-semibold text-gray-800">مقدار تخفیف</h4>
      </div>
      
      <div className="flex gap-2 select-none items-start">
        {/* Percent Input */}
        <div className={`transition-all duration-300 ease-out ${
          localActive === "percent" 
            ? "flex-[2]" 
            : localActive 
              ? "flex-0 opacity-0 w-0 overflow-hidden" 
              : "flex-1"
        }`}>
          <div
            onClick={() => activate("percent")}
            className="relative overflow-hidden rounded-xl bg-gray-100 flex items-center cursor-pointer h-12 w-full"
          >
            <div className="absolute right-3 text-purple-600 pointer-events-none">
              <Percent className="w-4 h-4" />
            </div>
            <input
              type="number"
              value={percent}
              onChange={handlePercentChange}
              placeholder="درصد"
              readOnly={localActive !== "percent"}
              className="w-full h-full px-3 bg-transparent outline-none pr-9 text-gray-800 remove-arrows leading-tight"
              min="0"
              max="100"
            />
            {localActive === "percent" && (
              <button 
                onClick={handleReset} 
                className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className={`transition-all duration-300 ease-out flex flex-col ${
          localActive === "fixed" 
            ? "flex-[2]" 
            : localActive 
              ? "flex-0 opacity-0 w-0 overflow-hidden" 
              : "flex-1"
        }`}>
          <div
            onClick={() => activate("fixed")}
            className="relative overflow-hidden rounded-xl bg-gray-100 flex items-center cursor-pointer h-12 w-full"
          >
            <div className="absolute right-3 text-green-600 pointer-events-none">
              <Banknote className="w-4 h-4" />
            </div>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="مبلغ"
              readOnly={localActive !== "fixed"}
              className="w-full h-full px-3 bg-transparent outline-none remove-arrows pr-9 pl-16 text-gray-800 leading-tight"
              min="0"
            />
            
            {localActive === "fixed" && (
              <div className="absolute left-9 text-xs text-gray-500 pointer-events-none font-medium">
                تومان
              </div>
            )}
            
            {localActive === "fixed" && (
              <button 
                onClick={handleReset} 
                className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {localActive === "fixed" && amount && Number(amount) > 0 && (
            <div className="text-xs text-gray-600 mt-1.5 pr-9 font-medium">
              {numberToPersianWords(Number(amount) * 10)} ریال
            </div>
          )}
        </div>
      </div>
      
      {!localActive && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          برای وارد کردن تخفیف، روی یکی از فیلدها کلیک کنید
        </p>
      )}
    </div>
  );
}

function ScheduleSection({ isEnabled, schedule, onToggle, onChange, error }) {
  const handleTimeChange = (field, value) => {
    onChange({ ...schedule, [field]: value });
  };

  return (
    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">
            میخواهید برای تخفیف زمان انتخاب کنید
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            isEnabled ? "bg-purple-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "-translate-x-6" : "-translate-x-1"
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                تاریخ شروع
              </label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={schedule.startDate}
                onChange={(date) => onChange({ ...schedule, startDate: date })}
                format="YYYY/MM/DD"
                className="rmdp-mobile"
                inputClass="w-full bg-white border border-gray-300 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ساعت شروع
              </label>
              <div className="flex items-center bg-white border border-gray-300 rounded-xl h-10 px-3 focus-within:border-purple-500">
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => handleTimeChange("startTime", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                تاریخ پایان
              </label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={schedule.endDate}
                onChange={(date) => onChange({ ...schedule, endDate: date })}
                format="YYYY/MM/DD"
                className="rmdp-mobile"
                inputClass="w-full bg-white border border-gray-300 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ساعت پایان
              </label>
              <div className="flex items-center bg-white border border-gray-300 rounded-xl h-10 px-3 focus-within:border-purple-500">
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => handleTimeChange("endTime", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
      
      {!isEnabled && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          تخفیف بدون محدودیت زمانی (همیشگی) اعمال می‌شود
        </p>
      )}
    </div>
  );
}

export default function TabModal({ isOpen, onClose, category, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [schedule, setSchedule] = useState({
    startDate: null, 
    endDate: null, 
    startTime: "00:00", 
    endTime: "23:59"
  });
  const [discount, setDiscount] = useState({ 
    percent: "", 
    amount: "", 
    activeType: null 
  });

  useEffect(() => {
    if (!isOpen) return;
    
    if (category?.discount) {
      const d = category.discount;
      setDiscount({
        percent: d.type === "percent" ? d.value : "",
        amount: d.type === "fixed" ? d.value : "",
        activeType: d.type
      });
      
      if (d.start_at && d.end_at) {
        setScheduleOn(true);
        const s = new Date(d.start_at);
        const e = new Date(d.end_at);
        setSchedule({
          startDate: s, 
          endDate: e,
          startTime: s.toTimeString().slice(0,5),
          endTime: e.toTimeString().slice(0,5)
        });
      } else {
        setScheduleOn(false);
        setSchedule({
          startDate: null, 
          endDate: null, 
          startTime: "00:00", 
          endTime: "23:59"
        });
      }
    } else {
      setDiscount({ percent: "", amount: "", activeType: null });
      setScheduleOn(false);
      setSchedule({
        startDate: null, 
        endDate: null, 
        startTime: "00:00", 
        endTime: "23:59"
      });
    }
  }, [isOpen, category]);

  const validate = () => {
    setError(null);
    
    if (!discount.activeType) {
      setError("مقدار تخفیف را وارد کنید");
      return false;
    }
    
    if (scheduleOn) {
      if (!schedule.startDate || !schedule.endDate) {
        setError("تاریخ شروع و پایان را انتخاب کنید");
        return false;
      }
      
      const startISO = persianToISO(schedule.startDate, schedule.startTime);
      const endISO = persianToISO(schedule.endDate, schedule.endTime);
      
      if (!startISO || !endISO) {
        setError("فرمت تاریخ نامعتبر است");
        return false;
      }
      
      if (new Date(endISO) <= new Date(startISO)) {
        setError("تاریخ پایان باید بعد از شروع باشد");
        return false;
      }
    }
    
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const payload = {
        category_id: category?.id,
        type: discount.activeType,
        value: discount.activeType === "percent" 
          ? Number(discount.percent) 
          : Number(discount.amount),
        ...(scheduleOn && {
          start_at: persianToISO(schedule.startDate, schedule.startTime),
          end_at: persianToISO(schedule.endDate, schedule.endTime)
        })
      };
      
      await createProductDiscount(payload);
      onClose();
      onSuccess?.();
    } catch (err) {
      setError("خطا در ذخیره");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`تخفیف ${category?.name || ""}`} 
      maxWidth="md"
    >
      <div dir="rtl" className="py-1 px-3 space-y-4 max-h-[80vh] overflow-y-auto">
        
        <ScheduleSection
          isEnabled={scheduleOn}
          schedule={schedule}
          onToggle={() => setScheduleOn(!scheduleOn)}
          onChange={setSchedule}
          error={error?.includes("تاریخ") || error?.includes("زمان") ? error : null}
        />

        <DiscountInputs value={discount} onChange={setDiscount} />

        {error && !error.includes("تاریخ") && !error.includes("زمان") && (
          <div className="flex items-center gap-2 text-red-500 text-sm p-2 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t mt-4">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition text-sm"
            disabled={loading}
          >
            انصراف
          </button>
          
          <button 
            onClick={save} 
            disabled={loading || !discount.activeType}
            className="px-6 py-2 rounded-xl bg-purple-600 text-white text-sm disabled:opacity-50 hover:bg-purple-700 transition"
          >
            {loading ? "..." : "ذخیره"}
          </button>
        </div>
      </div>

      <style>{`
        .remove-arrows::-webkit-outer-spin-button,
        .remove-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .remove-arrows[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </BaseModal>
  );
}
