import { useState, useEffect } from "react";
import BaseModal from "../../../basemodal/BaseModal";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/layouts/mobile.css";
import { 
  createCoupon, 
  updateCoupon 
} from "../../../../api/discountsApi";
import { 
  Tag, 
  Timer, 
  Clock, 
  CalendarDays, 
  AlertCircle, 
  Percent, 
  Banknote, 
  X, 
  Hash, 
  ShoppingCart,
  CheckCircle2
} from 'lucide-react';

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
    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
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
            className="relative overflow-hidden rounded-xl bg-white border border-gray-300 flex items-center cursor-pointer h-12 w-full hover:border-purple-400 transition-colors"
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
                className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
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
            className="relative overflow-hidden rounded-xl bg-white border border-gray-300 flex items-center cursor-pointer h-12 w-full hover:border-purple-400 transition-colors"
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
                className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
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
            محدودیت زمانی
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

export default function CouponModal({ isOpen, onClose, editItem, customer, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Coupon specific fields (removed code)
  const [usageLimit, setUsageLimit] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Discount value (percent/fixed)
  const [discount, setDiscount] = useState({ 
    percent: "", 
    amount: "", 
    activeType: null 
  });
  
  // Scheduling
  const [scheduleOn, setScheduleOn] = useState(false);
  const [schedule, setSchedule] = useState({
    startDate: null, 
    endDate: null, 
    startTime: "00:00", 
    endTime: "23:59"
  });

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // Parse existing coupon data
        setUsageLimit(editItem.usage_limit ? String(editItem.usage_limit) : "");
        setMinOrder(editItem.min_order_amount ? String(editItem.min_order_amount) : "");
        setIsActive(editItem.is_active !== false);
        
        // Parse discount type and value
        if (editItem.type && editItem.value !== undefined) {
          setDiscount({
            percent: editItem.type === "percent" ? String(editItem.value) : "",
            amount: editItem.type === "fixed" ? String(editItem.value) : "",
            activeType: editItem.type
          });
        } else {
          setDiscount({ percent: "", amount: "", activeType: null });
        }
        
        // Parse dates if exist
        if (editItem.starts_at && editItem.ends_at) {
          setScheduleOn(true);
          const s = new Date(editItem.starts_at);
          const e = new Date(editItem.ends_at);
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
        // Reset form for new coupon
        setUsageLimit("");
        setMinOrder("");
        setIsActive(true);
        setDiscount({ percent: "", amount: "", activeType: null });
        setScheduleOn(false);
        setSchedule({
          startDate: null, 
          endDate: null, 
          startTime: "00:00", 
          endTime: "23:59"
        });
      }
      setError(null);
      setLoading(false);
    }
  }, [isOpen, editItem]);

  // تعیین عنوان مودال و زیرنویس
  const getModalTitle = () => {
    if (editItem) return "ویرایش کد تخفیف";
    return "افزودن کد تخفیف";
  };

const getSubtitle = () => {
  if (editItem) {
    // اگر editItem.user آبجکت کامل باشه
    if (editItem.user?.fullname) {
      return `این کد متعلق به: ${editItem.user.fullname} ${editItem.user.phone ? `(${editItem.user.phone})` : ''}`;
    } 
    // اگر customer prop (که از parent پاس داده میشه) وجود داشته باشه
    else if (customer?.fullname) {
      return `این کد متعلق به: ${customer.fullname} ${customer.phone ? `(${customer.phone})` : ''}`;
    }
    // اگر فقط ID داشته باشیم
    else if (editItem.user_id || editItem.user) {
      const id = editItem.user_id || editItem.user;
      return `این کد متعلق به: مشتری خاص (ID: ${id})`;
    } else {
      return "این کد عمومی است";
    }
  }
  if (customer) {
    return `برای: ${customer.fullname} ${customer.phone ? `(${customer.phone})` : ''}`;
  }
  return "کد تخفیف عمومی (قابل استفاده برای همه)";
};


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

  const submit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const payload = {
        type: discount.activeType,
        value: discount.activeType === "percent" 
          ? Number(discount.percent) 
          : Number(discount.amount),
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        min_order_amount: minOrder ? parseInt(minOrder) : null,
        is_active: isActive,
        
        // اضافه کردن user فقط موقع ساخت کد جدید برای مشتری خاص
        // وقتی editItem null باشه یعنی داریم کد جدید می‌سازیم
        ...(customer && !editItem && { user: customer.id }),
        
        ...(scheduleOn && {
          starts_at: persianToISO(schedule.startDate, schedule.startTime),
          ends_at: persianToISO(schedule.endDate, schedule.endTime)
        })
      };

      if (editItem) {
        await updateCoupon(editItem.id, payload);
      } else {
        await createCoupon(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "خطا در ذخیره کد تخفیف");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      maxWidth="md"
    >
      <div dir="rtl" className="py-1 space-y-4 max-h-[80vh] overflow-y-auto">
        
        {/* متن ساده مشخص کننده مالک کد تخفیف */}
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center -mt-2 mb-2 font-medium">
          {getSubtitle()}
        </p>

        {/* Schedule Section - moved to top */}
        <ScheduleSection
          isEnabled={scheduleOn}
          schedule={schedule}
          onToggle={() => setScheduleOn(!scheduleOn)}
          onChange={setSchedule}
          error={error?.includes("تاریخ") || error?.includes("زمان") ? error : null}
        />

        {/* Discount Value (Percent/Amount) */}
        <DiscountInputs value={discount} onChange={setDiscount} />

        {/* Usage Limit and Min Order */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mr-1">
              <Hash className="w-3 h-3 text-gray-500" />
              حداکثر استفاده (اختیاری)
            </label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="نامحدود"
              className="w-full p-3 rounded-xl bg-white border border-gray-300 outline-none focus:border-purple-500 text-gray-800 remove-arrows text-sm"
              min="1"
            />
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mr-1">
              <ShoppingCart className="w-3 h-3 text-gray-500" />
              حداقل سفارش (تومان)
            </label>
            <input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="0"
              className="w-full p-3 rounded-xl bg-white border border-gray-300 outline-none focus:border-purple-500 text-gray-800 remove-arrows text-sm"
              min="0"
            />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${isActive ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-sm font-medium text-gray-700">
              {isActive ? "کد تخفیف فعال است" : "کد تخفیف غیرفعال است"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              isActive ? "bg-green-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? "-translate-x-6" : "-translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Error Display */}
        {error && !error.includes("تاریخ") && !error.includes("زمان") && (
          <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 transition text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            انصراف
          </button>

          <button
            onClick={submit}
            disabled={loading || !discount.activeType}
            className="px-8 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-purple-700 transition shadow-lg shadow-purple-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                در حال ذخیره...
              </span>
            ) : (
              "ذخیره کد تخفیف"
            )}
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
