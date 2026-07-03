import { useState, useEffect } from "react";
import { fetchGlobalDiscounts, createGlobalDiscount, updateGlobalDiscount, deleteGlobalDiscount } from "../../../../api/discountsApi";
import { useToast } from "../../../../context/ToastContext";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/layouts/mobile.css";
import { 
  Plus, 
  X, 
  Pencil, 
  Trash2,
  Clock, 
  AlertCircle,
  Percent,
  Banknote,
  CalendarDays,
  Timer,
  Tag,
  AlertTriangle
} from 'lucide-react';

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

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

/* --------------------------------------------------
   Components
-------------------------------------------------- */

function DiscountInputs({ value, onChange }) {
  const { percent, amount, activeType } = value;
  const [localActive, setLocalActive] = useState(activeType);

  useEffect(() => {
    setLocalActive(activeType);
  }, [activeType]);

  const numberToPersianWords = (num) => {
    if (!num || isNaN(num) || num === 0) return "";
    
    const number = Math.floor(num);
    
    const units = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
    const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
    const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
    const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
    const thousands = ["", "هزار", "میلیون", "میلیارد"];
    
    const convertThreeDigits = (n) => {
      if (n === 0) return "";
      
      const result = [];
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;
      
      if (h > 0) result.push(hundreds[h]);
      
      if (remainder > 0) {
        if (t === 1) {
          result.push(teens[u]);
        } else if (t > 1) {
          result.push(tens[t]);
          if (u > 0) result.push(units[u]);
        } else {
          result.push(units[u]);
        }
      }
      
      return result.join(" و ");
    };
    
    const parts = [];
    let i = 0;
    let tempNumber = number;
    
    while (tempNumber > 0) {
      const part = tempNumber % 1000;
      if (part > 0) {
        const converted = convertThreeDigits(part);
        if (converted) {
          parts.unshift(converted + (thousands[i] ? " " + thousands[i] : ""));
        }
      }
      tempNumber = Math.floor(tempNumber / 1000);
      i++;
    }
    
    return parts.join(" و ");
  };

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
        <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">مقدار تخفیف</h4>
      </div>
      
<div className="flex gap-2 select-none items-start">
  {/* Percent container */}
  <div className={`transition-all duration-300 ease-out ${
    localActive === "percent" 
      ? "flex-[2]" 
      : localActive 
        ? "flex-0 opacity-0 w-0 overflow-hidden" 
        : "flex-1"
  }`}>
    <div
      onClick={() => activate("percent")}
      className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-[#262B40] border border-transparent dark:border-gray-600 flex items-center cursor-pointer h-12 w-full"
    >
      <div className="absolute right-3 text-purple-600 dark:text-purple-400 pointer-events-none">
        <Percent className="w-4 h-4" />
      </div>
      <input
        type="number"
        value={percent}
        onChange={handlePercentChange}
        placeholder="درصد"
        readOnly={localActive !== "percent"}
        className="w-full h-full px-3 bg-transparent outline-none pr-9 text-gray-800 dark:text-gray-200 remove-arrows leading-tight"
        min="0"
        max="100"
      />
      {localActive === "percent" && (
        <button 
          onClick={handleReset} 
          className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>

  {/* Fixed amount container */}
  <div className={`transition-all duration-300 ease-out flex flex-col ${
    localActive === "fixed" 
      ? "flex-[2]" 
      : localActive 
        ? "flex-0 opacity-0 w-0 overflow-hidden" 
        : "flex-1"
  }`}>
    <div
      onClick={() => activate("fixed")}
      className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-[#262B40] border border-transparent dark:border-gray-600 flex items-center cursor-pointer h-12 w-full"
    >
      <div className="absolute right-3 text-green-600 dark:text-green-400 pointer-events-none">
        <Banknote className="w-4 h-4" />
      </div>
      <input
        type="number"
        value={amount}
        onChange={handleAmountChange}
        placeholder="مبلغ"
        readOnly={localActive !== "fixed"}
        className="w-full h-full px-3 bg-transparent outline-none remove-arrows pr-9 pl-6 text-gray-800 dark:text-gray-200 leading-tight"
        min="0"
      />
      
      {/* تومان label on the left side */}
      {localActive === "fixed" && (
        <div className="absolute left-9 text-xs text-gray-500 dark:text-gray-400 pointer-events-none font-medium">
          تومان
        </div>
      )}
      
      {localActive === "fixed" && (
        <button 
          onClick={handleReset} 
          className="absolute left-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    
    {/* Persian text equivalent in Rials */}
    {localActive === "fixed" && amount && Number(amount) > 0 && (
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 pr-9 font-medium">
        {numberToPersianWords(Number(amount) * 10)} ریال
      </div>
    )}
  </div>
</div>

      
      {!localActive && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
    <div className="space-y-3 bg-gray-50 dark:bg-[#262B40]/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            محدودیت زمانی
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            isEnabled ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
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
              <label className="text-xs text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
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
                inputClass="w-full bg-white dark:bg-[#262B40] border border-gray-300 dark:border-gray-600 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500 text-gray-800 dark:text-gray-200"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ساعت شروع
              </label>
              <div className="flex items-center bg-white dark:bg-[#262B40] border border-gray-300 dark:border-gray-600 rounded-xl h-10 px-3 focus-within:border-purple-500">
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => handleTimeChange("startTime", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
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
                inputClass="w-full bg-white dark:bg-[#262B40] border border-gray-300 dark:border-gray-600 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500 text-gray-800 dark:text-gray-200"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ساعت پایان
              </label>
              <div className="flex items-center bg-white dark:bg-[#262B40] border border-gray-300 dark:border-gray-600 rounded-xl h-10 px-3 focus-within:border-purple-500">
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => handleTimeChange("endTime", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200"
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
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          تخفیف بدون محدودیت زمانی (همیشگی) اعمال می‌شود
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------
   Main Component
-------------------------------------------------- */

export default function GlobalDiscountTab() {
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    item: null
  });
  
  const [discount, setDiscount] = useState({ percent: "", amount: "", activeType: null });
  const [scheduleOn, setScheduleOn] = useState(false);
  const [schedule, setSchedule] = useState({
    startDate: null, 
    endDate: null, 
    startTime: "00:00", 
    endTime: "23:59"
  });
  const [error, setError] = useState(null);

  const { addToast } = useToast();

  const load = async () => {
    try {
      const res = await fetchGlobalDiscounts();
      setItems(res);
    } catch (err) {
      console.error("Error loading global discounts:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setDiscount({ percent: "", amount: "", activeType: null });
    setScheduleOn(false);
    setSchedule({ startDate: null, endDate: null, startTime: "00:00", endTime: "23:59" });
    setError(null);
    setEditingId(null);
  };

  const startAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setDiscount({
      percent: item.type === "percent" ? item.value : "",
      amount: item.type === "fixed" ? item.value : "",
      activeType: item.type
    });
    
    if (item.start_at && item.end_at) {
      setScheduleOn(true);
      const s = new Date(item.start_at);
      const e = new Date(item.end_at);
      setSchedule({
        startDate: s, 
        endDate: e,
        startTime: s.toTimeString().slice(0,5),
        endTime: e.toTimeString().slice(0,5)
      });
    } else {
      setScheduleOn(false);
      setSchedule({ startDate: null, endDate: null, startTime: "00:00", endTime: "23:59" });
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    resetForm();
  };

  const validateForm = () => {
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

  const saveDiscount = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const payload = {
        type: discount.activeType,
        value: discount.activeType === "percent" 
          ? Number(discount.percent) 
          : Number(discount.amount),
        ...(scheduleOn && {
          start_at: persianToISO(schedule.startDate, schedule.startTime),
          end_at: persianToISO(schedule.endDate, schedule.endTime)
        })
      };

      if (editingId) {
        await updateGlobalDiscount(editingId, payload);
        addToast("تخفیف با موفقیت بروزرسانی شد", "success");
      } else {
        await createGlobalDiscount(payload);
        addToast("تخفیف جدید با موفقیت ایجاد شد", "success");
      }
      
      await load();
      setIsEditing(false);
      resetForm();
    } catch (err) {
      setError("خطا در ذخیره تخفیف");
      addToast("خطا در ذخیره تخفیف", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (item) => {
    setDeleteConfirm({
      isOpen: true,
      item: item
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, item: null });
    setDeletingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.item) return;
    
    const id = deleteConfirm.item.id;
    setDeletingId(id);
    
    try {
      await deleteGlobalDiscount(id);
      addToast("تخفیف با موفقیت حذف شد", "success");
      await load();
      closeDeleteConfirm();
    } catch (err) {
      console.error("Error deleting discount:", err);
      addToast("خطا در حذف تخفیف", "error");
      setError("خطا در حذف تخفیف");
    } finally {
      setDeletingId(null);
    }
  };

  const getItemDisplayName = (item) => {
    if (!item) return "";
    return item.type === "percent" 
      ? `${item.value}%` 
      : `${item.value.toLocaleString()} تومان`;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 px-3 md:px-4 overflow-x-hidden">
      <div className="w-full p-4 md:p-5 rounded-2xl bg-white/70 dark:bg-[#262B40]/90 backdrop-blur-md border border-sky-200 dark:border-gray-600 shadow-lg">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">
              تخفیف‌های عمومی
            </h3>
          </div>

          {!isEditing && (
            <button
              onClick={startAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white shadow hover:scale-105 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              افزودن  
            </button>
          )}
        </div>

        {/* Inline Form */}
        {isEditing && (
          <div className="mb-6 p-4 bg-white/90 dark:bg-[#262B40]/80 rounded-xl border border-sky-200 dark:border-gray-600 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
              <div className="flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4 text-purple-600" /> : <Plus className="w-4 h-4 text-purple-600" />}
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {editingId ? "ویرایش تخفیف" : "تخفیف جدید"}
                </h4>
              </div>
              <button 
                onClick={cancelEdit}
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ScheduleSection
              isEnabled={scheduleOn}
              schedule={schedule}
              onToggle={() => setScheduleOn(!scheduleOn)}
              onChange={setSchedule}
              error={error?.includes("تاریخ") || error?.includes("زمان") ? error : null}
            />

            <DiscountInputs value={discount} onChange={setDiscount} />

            {error && !error.includes("تاریخ") && !error.includes("زمان") && (
              <div className="flex items-center gap-2 text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2">
              <button 
                onClick={saveDiscount}
                disabled={loading || !discount.activeType}
                className="flex items-center  gap-1 px-6 py-2 rounded-xl bg-purple-600 text-white text-sm disabled:opacity-50 hover:bg-purple-700 transition"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingId ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    ذخیره تغییرات
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    افزودن
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {items.length === 0 && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400 gap-2">
            <Tag className="w-10 h-10 opacity-30" />
            <p>هیچ تخفیف عمومی فعالی موجود نیست.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white/90 dark:bg-[#262B40]/80 border border-sky-200/60 dark:border-gray-600 rounded-xl shadow-sm transition hover:shadow-md flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${
                      item.type === "percent" 
                        ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300" 
                        : "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                    }`}>
                      {item.type === "percent" ? (
                        <><Percent className="w-3 h-3" /> درصدی</>
                      ) : (
                        <><Banknote className="w-3 h-3" /> مبلغی</>
                      )}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {item.type === "percent" ? `${item.value}%` : `${item.value.toLocaleString()} تومان`}
                    </span>
                    {item.start_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        (تا {new Date(item.end_at).toLocaleDateString('fa-IR')})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-sky-100 hover:bg-sky-200 dark:bg-[#8AA1C4] dark:hover:bg-[#7a92b8] text-gray-800 dark:text-white transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>ویرایش</span>
                  </button>
                  
                  <button
                    onClick={() => openDeleteConfirm(item)}
                    disabled={deletingId === item.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900/70 text-red-700 dark:text-red-200 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 h-full backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white dark:bg-[#262B40] rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-gray-600 transform scale-100 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-200">تأیید حذف</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">این عملیات قابل بازگشت نیست</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-[#2d3350]/50 p-3 rounded-lg">
              آیا از حذف تخفیف 
              <span className="font-bold mx-1 text-gray-800 dark:text-gray-200 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">
                {getItemDisplayName(deleteConfirm.item)}
              </span>
              اطمینان دارید؟
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeDeleteConfirm}
                disabled={deletingId === deleteConfirm.item?.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm font-medium"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId === deleteConfirm.item?.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirm.item?.id ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال حذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    بله، حذف شود
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        .remove-arrows::-webkit-outer-spin-button,
        .remove-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .remove-arrows[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}