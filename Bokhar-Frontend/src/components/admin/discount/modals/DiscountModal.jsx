import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useReducer,
  useMemo,
  memo,
} from "react";
import BaseModal from "../../../basemodal/BaseModal";
import {
  fetchProductFullPricing,
  createProductDiscount,
} from "../../../../api/discountsApi";
// Install: npm install react-multi-date-picker
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/layouts/mobile.css";

// ==========================================
// Utility Functions
// ==========================================

const formatDateForInput = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const formatTimeForInput = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toTimeString().slice(0, 5);
  } catch {
    return "";
  }
};

const parseDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  try {
    const time = timeStr || "00:00";
    const date = new Date(`${dateStr}T${time}`);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Convert Persian Date object to ISO string
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

// ==========================================
// Reducer & State Management
// ==========================================

const initialState = {
  loading: false,
  tabs: [],
  pricing: {},
  activeTab: 0,
  discounts: {},
  isScheduleEnabled: false, // ✅ Toggle state
  schedule: {
    startDate: null, // Persian date object
    endDate: null,   // Persian date object
    startTime: "00:00",
    endTime: "23:59",
  },
  errors: {},
};

function discountReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    
    case "INIT_DATA":
      return {
        ...state,
        tabs: action.payload.tabs,
        pricing: action.payload.pricing,
        discounts: action.payload.discounts,
        schedule: action.payload.schedule,
        isScheduleEnabled: action.payload.isScheduleEnabled, // ✅ Restore toggle state
        activeTab: 0,
        errors: {},
      };
    
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    
    case "TOGGLE_MATERIAL":
      return {
        ...state,
        discounts: {
          ...state.discounts,
          [state.activeTab]: {
            ...state.discounts[state.activeTab],
            [action.payload]: state.discounts[state.activeTab]?.[action.payload]
              ? undefined
              : { percent: "", amount: "" },
          },
        },
      };
    
    case "UPDATE_DISCOUNT_VALUE":
      return {
        ...state,
        discounts: {
          ...state.discounts,
          [state.activeTab]: {
            ...state.discounts[state.activeTab],
            [action.payload.material]: {
              ...state.discounts[state.activeTab]?.[action.payload.material],
              [action.payload.field]: action.payload.value,
            },
          },
        },
      };
    
    case "TOGGLE_SCHEDULE": // ✅ New action
      return {
        ...state,
        isScheduleEnabled: !state.isScheduleEnabled,
        errors: { ...state.errors, schedule: undefined },
      };
    
    case "SET_SCHEDULE":
      return {
        ...state,
        schedule: { ...state.schedule, ...action.payload },
        errors: { ...state.errors, ...action.payload.errors },
      };
    
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.payload.field]: action.payload.message },
      };
    
    case "CLEAR_ERRORS":
      return { ...state, errors: {} };
    
    default:
      return state;
  }
}

// ==========================================
// Custom Hook
// ==========================================

function useDiscountModal(product, isOpen) {
  const [state, dispatch] = useReducer(discountReducer, initialState);

  useEffect(() => {
    if (!isOpen || !product?.id) return;

    const loadData = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        const data = await fetchProductFullPricing(product.id);
        const tabs = Object.keys(data.pricing);
        
        if (tabs.length === 0) {
          dispatch({ type: "SET_LOADING", payload: false });
          return;
        }

        // Initialize discounts from existing data
        const initialDiscounts = {};
        let hasAnySchedule = false; // ✅ Check if any discount has schedule
        
        tabs.forEach((tabName, index) => {
          initialDiscounts[index] = {};
          const tabData = data.pricing[tabName];
          
          tabData.materialPrices?.forEach((mat) => {
            if (mat.has_discount && mat.discount_value != null) {
              initialDiscounts[index][mat.material] = {
                percent: mat.discount_type === "percent" ? mat.discount_value : "",
                amount: mat.discount_type === "fixed" ? mat.discount_value : "",
              };
              if (mat.discount_start_at && mat.discount_end_at) {
                hasAnySchedule = true;
              }
            }
          });
        });

        // Extract schedule from first available discount
        let schedule = {
          startDate: null,
          endDate: null,
          startTime: "00:00",
          endTime: "23:59",
        };

        for (const tabName of tabs) {
          const tabData = data.pricing[tabName];
          const matWithDiscount = tabData.materialPrices?.find(
            (m) => m.has_discount && m.discount_start_at && m.discount_end_at
          );
          
          if (matWithDiscount) {
            // Convert to Persian Date objects
            const start = new Date(matWithDiscount.discount_start_at);
            const end = new Date(matWithDiscount.discount_end_at);
            
            schedule = {
              startDate: start, // Will be converted by DatePicker
              endDate: end,
              startTime: formatTimeForInput(start),
              endTime: formatTimeForInput(end),
            };
            break;
          }
        }

        dispatch({
          type: "INIT_DATA",
          payload: {
            tabs,
            pricing: data.pricing,
            discounts: initialDiscounts,
            schedule,
            isScheduleEnabled: hasAnySchedule, // ✅ Enable toggle if data exists
          },
        });
      } catch {
        dispatch({
          type: "SET_ERROR",
          payload: { field: "global", message: "خطا در دریافت اطلاعات" },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    loadData();
  }, [isOpen, product?.id]);

  const validateAndSave = useCallback(async () => {
    const { schedule, discounts, tabs, pricing, isScheduleEnabled } = state;
    
    dispatch({ type: "CLEAR_ERRORS" });
    
    let startISO, endISO;

    // ✅ Only validate schedule if enabled
    if (isScheduleEnabled) {
      if (!schedule.startDate || !schedule.endDate) {
        dispatch({
          type: "SET_ERROR",
          payload: { field: "schedule", message: "تاریخ شروع و پایان الزامی است" },
        });
        return false;
      }

      startISO = persianToISO(schedule.startDate, schedule.startTime);
      endISO = persianToISO(schedule.endDate, schedule.endTime);

      if (!startISO || !endISO) {
        dispatch({
          type: "SET_ERROR",
          payload: { field: "schedule", message: "فرمت تاریخ نامعتبر است" },
        });
        return false;
      }

      if (new Date(endISO) <= new Date(startISO)) {
        dispatch({
          type: "SET_ERROR",
          payload: { field: "schedule", message: "تاریخ پایان باید بعد از شروع باشد" },
        });
        return false;
      }
    }

    // Prepare payload
    const payload = [];

    Object.entries(discounts).forEach(([tabIndex, materials]) => {
      const tabName = tabs[tabIndex];
      const tabData = pricing[tabName];
      if (!tabData) return;

      Object.entries(materials).forEach(([matName, values]) => {
        const matObj = tabData.materialPrices?.find(
          (m) => m.material === matName
        );
        if (!matObj) return;

        const hasPercent =
          values?.percent !== "" && values?.percent !== undefined && !isNaN(values.percent);
        const hasAmount =
          values?.amount !== "" && values?.amount !== undefined && !isNaN(values.amount);

        if (!hasPercent && !hasAmount) {
          if (matObj.has_discount) {
            payload.push({
              material: matObj.id,
              type: "fixed",
              value: 0,
            });
          }
          return;
        }

        const discountPayload = {
          material: matObj.id,
          type: hasPercent ? "percent" : "fixed",
          value: hasPercent ? Number(values.percent) : Number(values.amount),
        };

        // ✅ Only add dates if scheduling is enabled
        if (isScheduleEnabled) {
          discountPayload.start_at = startISO;
          discountPayload.end_at = endISO;
        }

        payload.push(discountPayload);
      });
    });

    if (payload.length === 0) return false;

    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      const results = await Promise.allSettled(
        payload.map((item) => createProductDiscount(item))
      );
      
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        dispatch({
          type: "SET_ERROR",
          payload: { field: "global", message: `خطا در ذخیره ${failures.length} مورد` },
        });
        return false;
      }
      
      return true;
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload: { field: "global", message: "خطا در ذخیره تخفیف" },
      });
      return false;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state]);

  return { state, dispatch, validateAndSave };
}

// ==========================================
// Sub Components
// ==========================================

// ✅ Updated Schedule Component with Persian Calendar
const DiscountTimeInputs = memo(function DiscountTimeInputs({
  isEnabled,
  schedule,
  onToggle,
  onChange,
  error,
}) {
  const handleTimeChange = useCallback((field, value) => {
    onChange({ [field]: value, errors: { schedule: undefined } });
  }, [onChange]);

  return (
    <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          میخواهید برای تخفیف زمان انتخاب کنید
        </span>
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

      {/* Persian Date & Time Inputs - Only show if enabled */}
      {isEnabled && (
        <div className="space-y-3 pt-2">
          {/* Row 1: Start Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1">تاریخ شروع</label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={schedule.startDate}
                onChange={(date) => onChange({ startDate: date })}
                format="YYYY/MM/DD"
                className="rmdp-mobile"
                inputClass="w-full bg-white border border-gray-300 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1">ساعت شروع</label>
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

          {/* Row 2: End Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1">تاریخ پایان</label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={schedule.endDate}
                onChange={(date) => onChange({ endDate: date })}
                format="YYYY/MM/DD"
                className="rmdp-mobile"
                inputClass="w-full bg-white border border-gray-300 rounded-xl h-10 px-3 text-sm outline-none focus:border-purple-500"
                containerClassName="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 mr-1">ساعت پایان</label>
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
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      )}
      
      {!isEnabled && (
        <p className="text-xs text-gray-500">
          تخفیف بدون محدودیت زمانی (همیشگی) اعمال می‌شود
        </p>
      )}
    </div>
  );
});

const MaterialDiscountInput = memo(function MaterialDiscountInput({
  material,
  percentValue,
  amountValue,
  onToggle,
  onChangePercent,
  onChangeAmount,
  active,
}) {
  const [activeType, setActiveType] = useState(null);
  const percentRef = useRef(null);
  const amountRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setActiveType(null);
      return;
    }
    if (percentValue) setActiveType("percent");
    else if (amountValue) setActiveType("amount");
    else setActiveType(null);
  }, [active, percentValue, amountValue]);

  useEffect(() => {
    if (activeType === "percent" && percentRef.current) {
      percentRef.current.focus();
      percentRef.current.select();
    } else if (activeType === "amount" && amountRef.current) {
      amountRef.current.focus();
      amountRef.current.select();
    }
  }, [activeType]);

  const handleReset = useCallback((e) => {
    if (e) e.stopPropagation();
    setActiveType(null);
    onChangePercent("");
    onChangeAmount("");
  }, [onChangePercent, onChangeAmount]);

  const activateType = useCallback((e, type) => {
    e.stopPropagation();
    if (!activeType) setActiveType(type);
  }, [activeType]);

const wrapperClass = useMemo(() => {
  if (activeType === null) return "flex-1";
  if (activeType === "percent") return "flex-[2]";
  if (activeType === "amount") return "flex-0 opacity-0";
  return "flex-1";
}, [activeType]);


  const handlePercentChange = useCallback((e) => {
    let v = e.target.value;
    if (v !== "") {
      const num = Number(v);
      if (num < 0) v = "0";
      if (num > 100) v = "100";
    }
    onChangePercent(v);
  }, [onChangePercent]);

  const handleAmountChange = useCallback((e) => {
    let v = e.target.value;
    if (v !== "" && Number(v) < 0) v = "0";
    onChangeAmount(v);
  }, [onChangeAmount]);

  if (!active) {
    return (
      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 min-w-[70px]"
        >
          {material}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-2 rounded-xl bg-purple-600 text-white min-w-[70px]"
        >
          {material}
        </button>

        {/* ✅ Fixed: Changed h-10 md:h-12 to min-h-10 md:min-h-12 and added items-start */}
        <div className="flex gap-2 flex-1 min-h-10 md:min-h-12 select-none items-start">
          {/* ✅ Added h-10 md:h-12 to maintain fixed height */}
          <div
            onClick={(e) => activateType(e, "percent")}
            className={`relative overflow-hidden rounded-xl bg-gray-100 flex items-center transition-all duration-300 ease-out cursor-pointer h-10 md:h-12 ${wrapperClass}`}
          >
            <input
              ref={percentRef}
              type="number"
              value={percentValue ?? ""}
              onClick={(e) => activateType(e, "percent")}
              onChange={handlePercentChange}
              placeholder="درصد"
              readOnly={activeType !== "percent"}
              className="w-full h-full px-3 bg-transparent outline-none remove-arrows pr-6"
              min="0"
              max="100"
            />
            <span className="absolute right-3 text-sm text-gray-500 pointer-events-none">٪</span>
            {activeType === "percent" && (
              <button onClick={handleReset} className="absolute left-3 text-gray-400">×</button>
            )}
          </div>

          <div className={`flex flex-col transition-all duration-300 ease-out ${
            activeType === "amount" 
              ? "flex-[2]" 
              : activeType 
                ? "flex-0 opacity-0 w-0 overflow-hidden" 
                : "flex-1"
          }`}>
            <div
              onClick={(e) => activateType(e, "amount")}
              className="relative overflow-hidden rounded-xl bg-gray-100 flex items-center transition-all duration-300 ease-out cursor-pointer h-10 md:h-12 w-full"
            >
              <input
                ref={amountRef}
                type="number"
                value={amountValue ?? ""}
                onClick={(e) => activateType(e, "amount")}
                onChange={handleAmountChange}
                placeholder="مبلغ"
                readOnly={activeType !== "amount"}
                className="w-full h-full px-3 bg-transparent outline-none remove-arrows pr-8"
                min="0"
              />
              <span className="absolute right-3 h-full text-sm text-gray-500 pointer-events-none">$</span>
              {activeType === "amount" && (
                <button onClick={handleReset} className="absolute left-3 text-gray-400">×</button>
              )}
            </div>
            {activeType === "amount" && amountValue && Number(amountValue) > 0 && (
              <div className="text-xs text-gray-600 mt-1 font-medium text-right">
                {numberToPersianWords(Number(amountValue) * 10)} ریال
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const PriceDisplay = memo(function PriceDisplay({ basePrice, percent, amount }) {
  const display = useMemo(() => {
    const hasPercent = percent !== undefined && percent !== "" && !isNaN(percent);
    const hasAmount = amount !== undefined && amount !== "" && !isNaN(amount);
    
    if (!hasPercent && !hasAmount) {
      return {
        showDiscount: false,
        original: basePrice,
      };
    }

    const originalPrice = Number(basePrice) || 0;
    let discounted = originalPrice;

    if (hasAmount) {
      discounted -= Number(amount);
    } else if (hasPercent) {
      discounted -= (originalPrice * Number(percent)) / 100;
    }

    if (discounted < 0) discounted = 0;

    return {
      showDiscount: true,
      original: originalPrice,
      discounted,
      type: hasAmount ? "amount" : "percent",
      value: hasAmount ? amount : percent,
    };
  }, [basePrice, percent, amount]);

  if (!display.showDiscount) {
    return <div className="text-xs text-gray-500">قیمت: {display.original?.toLocaleString()} تومان</div>;
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <span className="text-red-600 line-through">
        {display.original.toLocaleString()} تومان
      </span>
      <span className="text-green-600 font-semibold">
        {display.discounted.toLocaleString()} تومان
        <span className="text-gray-500 mr-1">
          ({display.type === "amount" 
            ? `${Number(display.value).toLocaleString()} تومان` 
            : `${display.value}% تخفیف`}
          )
        </span>
      </span>
    </div>
  );
});

// ==========================================
// Main Component
// ==========================================

export default function DiscountModal({ isOpen, onClose, product, category }) {
  const target = product || category;
  const { state, dispatch, validateAndSave } = useDiscountModal(product, isOpen);

  const handleSave = useCallback(async () => {
    const success = await validateAndSave();
    if (success) onClose();
  }, [validateAndSave, onClose]);

  const currentTabData = useMemo(() => {
    const tabName = state.tabs[state.activeTab];
    if (!tabName) return { materialPrices: [] };
    return state.pricing[tabName] || { materialPrices: [] };
  }, [state.tabs, state.activeTab, state.pricing]);

  const handleToggleMaterial = useCallback((material) => {
    dispatch({ type: "TOGGLE_MATERIAL", payload: material });
  }, [dispatch]);

  const handleChangePercent = useCallback((material, value) => {
    dispatch({
      type: "UPDATE_DISCOUNT_VALUE",
      payload: { material, field: "percent", value },
    });
  }, [dispatch]);

  const handleChangeAmount = useCallback((material, value) => {
    dispatch({
      type: "UPDATE_DISCOUNT_VALUE",
      payload: { material, field: "amount", value },
    });
  }, [dispatch]);

  const handleScheduleChange = useCallback((updates) => {
    dispatch({ type: "SET_SCHEDULE", payload: updates });
  }, [dispatch]);

  const handleToggleSchedule = useCallback(() => {
    dispatch({ type: "TOGGLE_SCHEDULE" });
  }, [dispatch]);

  const currentDiscounts = state.discounts[state.activeTab] || {};

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`تنظیم تخفیف برای ${target?.title || target?.name || ""}`}
      maxWidth="lg"
    >
      <div dir="rtl" className="py-1 max-h-[80vh] px-3 overflow-y-auto">
        {/* ✅ Updated Schedule Component */}
        <DiscountTimeInputs
          isEnabled={state.isScheduleEnabled}
          schedule={state.schedule}
          onToggle={handleToggleSchedule}
          onChange={handleScheduleChange}
          error={state.errors.schedule}
        />

        {state.errors.global && (
          <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded-lg">
            {state.errors.global}
          </div>
        )}

        {state.loading && (
          <div className="text-center py-6">در حال دریافت اطلاعات...</div>
        )}

        {!state.loading && state.tabs.length > 0 && (
          <>
            <div className="flex gap-1 pt-2">
              {state.tabs.map((tab, i) => {
                const hasData = Object.keys(state.discounts[i] || {}).length > 0;
                const isActive = state.activeTab === i;

                return (
                  <button
                    key={tab}
                    onClick={() => dispatch({ type: "SET_ACTIVE_TAB", payload: i })}
                    className={`flex-1 py-2 text-sm border rounded-t-xl transition relative ${
                      isActive
                        ? "bg-white border-gray-200 border-b-white font-semibold"
                        : "bg-gray-200 border-transparent text-gray-500"
                    }`}
                  >
                    {tab}
                    {hasData && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 border-t-white rounded-b-xl p-3 space-y-4 max-h-[50vh] overflow-y-auto">
              {currentTabData.materialPrices?.map((mat) => {
                const saved = currentDiscounts[mat.material] || {};
                const active = !!currentDiscounts[mat.material];

                return (
                  <div key={mat.material} className="space-y-2">
                    <MaterialDiscountInput
                      material={mat.material}
                      percentValue={saved.percent}
                      amountValue={saved.amount}
                      onToggle={() => handleToggleMaterial(mat.material)}
                      onChangePercent={(v) => handleChangePercent(mat.material, v)}
                      onChangeAmount={(v) => handleChangeAmount(mat.material, v)}
                      active={active}
                    />

                    {active && (
                      <div className="mr-[80px]">
                        <PriceDisplay
                          basePrice={mat.price}
                          percent={saved.percent}
                          amount={saved.amount}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-between mt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
            disabled={state.loading}
          >
            انصراف
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-purple-600 text-white disabled:opacity-50 hover:bg-purple-700 transition"
            disabled={state.loading}
          >
            {state.loading ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
