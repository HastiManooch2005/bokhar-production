import { useReducer, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import Factor from "../components/orders/Factor";
import DateTimeRangePicker from "../components/orders/time/DateTimeRangePicker";
import MapSelector from "../components/orders/map/MapSelector.jsx";
import Payment from "../components/orders/Payment";
import StepProgress from "../components/orders/StepProgress";

// -------------------- constants (خارج از کامپوننت برای جلوگیری از ساخت مجدد) --------------------
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const DISCOUNT_CODES = {
  OFF10: 0.1,
  OFF20: 0.2,
};

const STEP_MAP = { 1: "factor", 2: "location", 3: "time", 4: "payment" };
const STEP_LABELS = ["فاکتور", "مکان", "زمان", "پرداخت"];

const initialState = {
  step: Number(localStorage.getItem("orderStep")) || 1,
  maxStep: Number(localStorage.getItem("orderMaxStep")) || 1,
  orderData: localStorage.getItem("orderData")
    ? JSON.parse(localStorage.getItem("orderData"))
    : {
        cartItems: [],
        datetime: { delivery: {}, pickup: {} },
        location: null,
        discountCode: "",
        discountAmount: 0,
      },
  factorTotal: 0,
  originalFactorTotal: 0,  // اضافه شده برای نگهداری قیمت اصلی قبل از تخفیف آیتم‌ها
};

// -------------------- reducer --------------------
function reducer(state, action) {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_MAX_STEP":
      return { ...state, maxStep: action.payload };
    case "SET_ORDER_DATA":
      return { ...state, orderData: { ...state.orderData, ...action.payload } };
    case "SET_FACTOR_TOTAL":
      return { ...state, factorTotal: action.payload };
    case "SET_ORIGINAL_FACTOR_TOTAL":  // اضافه شده
      return { ...state, originalFactorTotal: action.payload };
    case "RESET_ORDER":
      return { ...initialState, step: 1, maxStep: 1 };
    default:
      return state;
  }
}

// -------------------- main component --------------------
export default function Order() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, maxStep, orderData, factorTotal, originalFactorTotal } = state;

  const stepType = useCallback((s) => STEP_MAP[s] || null, []);

  // -------------------- effects --------------------
  useEffect(() => {
    localStorage.setItem("orderData", JSON.stringify(orderData));
  }, [orderData]);

  useEffect(() => {
    localStorage.setItem("orderStep", step);
    localStorage.setItem("orderMaxStep", maxStep);
  }, [step, maxStep]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // -------------------- memoized values (مهم برای جلوگیری از حلقه بی‌نهایت) --------------------
  
  // مموریزه کردن datetime برای جلوگیری از ساخت آبجکت جدید در هر رندر
  const dateTimeValue = useMemo(() => orderData.datetime, [orderData.datetime]);
  
  // مموریزه کردن location برای جلوگیری از ساخت آبجکت جدید در هر رندر
  const locationValue = useMemo(() => orderData.location, [orderData.location]);

  // محاسبه هزینه سرویس از دیتای ذخیره شده
  const servicePrice = useMemo(() => {
    return orderData.datetime?.pricing?.amount || 0;
  }, [orderData.datetime?.pricing?.amount]);

  const serviceType = useMemo(() => {
    return orderData.datetime?.pricing?.type || null;
  }, [orderData.datetime?.pricing?.type]);

  const serviceHours = useMemo(() => {
    return orderData.datetime?.pricing?.hours || 0;
  }, [orderData.datetime?.pricing?.hours]);

  // محاسبه مبلغ نهایی: جمع خرید + هزینه سرویس - تخفیف
  const finalTotal = useMemo(() => {
    return factorTotal + servicePrice - (orderData.discountAmount || 0);
  }, [factorTotal, servicePrice, orderData.discountAmount]);

  // -------------------- navigation handlers (همه با useCallback) --------------------
  const goToStep = useCallback((targetStep) => {
    if (targetStep <= maxStep && targetStep >= 1) {
      dispatch({ type: "SET_STEP", payload: targetStep });
    }
  }, [maxStep]);

  const handleNext = useCallback(() => {
    const currentType = stepType(step);

    // ولیدیشن مرحله مکان
    if (currentType === "location") {
      const { location } = orderData;
      if (!location?.coords || !location?.plaque || !location?.unit) {
        toast.error("لطفاً موقعیت مکانی را کامل انتخاب کنید.");
        return;
      }
    }

    // ولیدیشن مرحله زمان
    if (currentType === "time") {
      const { delivery, pickup } = orderData.datetime;
      if (!delivery?.date || !delivery?.time || !pickup?.date || !pickup?.time) {
        toast.error("لطفاً زمان تحویل دادن و تحویل گرفتن را کامل انتخاب کنید.");
        return;
      }
    }

    const stepsCount = Object.keys(STEP_MAP).length;
    if (step < stepsCount) {
      const nextStep = step + 1;
      dispatch({ type: "SET_STEP", payload: nextStep });
      if (nextStep > maxStep) {
        dispatch({ type: "SET_MAX_STEP", payload: nextStep });
      }
    }
  }, [step, maxStep, orderData, stepType]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      dispatch({ type: "SET_STEP", payload: step - 1 });
    }
  }, [step]);

  const handleStepClick = useCallback((clickedStep) => {
    if (clickedStep <= maxStep)
      dispatch({ type: "SET_STEP", payload: clickedStep });
  }, [maxStep]);

  // -------------------- event handlers (مموریزه شده) --------------------
  
  const handleDateTimeChange = useCallback((datetime) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { datetime } });
  }, []);

  const handleLocationSelect = useCallback((location) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { location } });
  }, []);

  const handleFactorTotalChange = useCallback((data) => {
    // اگر object باشد (فرمت جدید) هر دو مقدار را ذخیره می‌کنیم
    if (data && typeof data === 'object') {
      dispatch({ type: "SET_FACTOR_TOTAL", payload: data.total });
      dispatch({ type: "SET_ORIGINAL_FACTOR_TOTAL", payload: data.originalTotal });
    } else {
      // پشتیبانی از فرمت قدیمی (فقط عدد)
      dispatch({ type: "SET_FACTOR_TOTAL", payload: data });
    }
  }, []);

  const goToTimeStep = useCallback(() => {
    const nextStep = 2;
    dispatch({ type: "SET_STEP", payload: nextStep });
    if (nextStep > maxStep)
      dispatch({ type: "SET_MAX_STEP", payload: nextStep });
  }, [maxStep]);

  const setDiscountCode = useCallback((code) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { discountCode: code } });
  }, []);

  const applyDiscount = useCallback(() => {
    const rate = DISCOUNT_CODES[orderData.discountCode?.toUpperCase()];
    if (rate) {
      dispatch({
        type: "SET_ORDER_DATA",
        payload: { discountAmount: rate * factorTotal },
      });
      toast.success("تخفیف اعمال شد 🎉");
      return true;
    }
    toast.error("کد تخفیف نامعتبر است ❌");
    return false;
  }, [orderData.discountCode, factorTotal]);

  const submitOrder = useCallback(async () => {
    try {
      // ارسال کل دیتا شامل pricing به سرور
      const total = finalTotal;
      await axios.post(`${API_URL}/orders/`, {
        ...orderData,
        subtotal: factorTotal,
        servicePrice: servicePrice,
        total,
      });
      toast.success("سفارش با موفقیت ثبت شد ✅");
      ["orderData", "orderStep", "orderMaxStep"].forEach((key) =>
        localStorage.removeItem(key)
      );
      dispatch({ type: "RESET_ORDER" });
    } catch (err) {
      console.error(err);
      toast.error("خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.");
    }
  }, [orderData, factorTotal, servicePrice, finalTotal]);

  // -------------------- render --------------------
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Toaster position="top-center" />
      
      <StepProgress
        steps={STEP_LABELS.map((label, idx) => ({ id: idx + 1, label }))}
        step={step}
        maxStep={maxStep}
        onStepClick={handleStepClick}
      />

      <div className="min-h-[400px] mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* مرحله ۱: فاکتور */}
            {stepType(step) === "factor" && (
              <Factor
                onTotalChange={handleFactorTotalChange}
                goToTimeStep={goToTimeStep}
              />
            )}

            {/* مرحله ۲: انتخاب مکان */}
            {stepType(step) === "location" && (
              <MapSelector
                initialPosition={locationValue?.coords}
                initialAddress={locationValue?.address || ""}
                onLocationSelect={handleLocationSelect}
                goToNextStep={handleNext}
                goToPrevStep={handleBack}
              />
            )}

            {/* مرحله ۳: انتخاب زمان */}
            {stepType(step) === "time" && (
              <DateTimeRangePicker
                value={dateTimeValue}
                onChange={handleDateTimeChange}
                onGoLocation={handleNext}
                onComplete={() => {
                  console.log("Time selection complete");
                }}
              />
            )}

            {/* مرحله ۴: پرداخت */}
            {stepType(step) === "payment" && (
              <Payment
                subtotal={factorTotal}
                originalSubtotal={originalFactorTotal}  // اضافه شده
                total={finalTotal}
                servicePrice={servicePrice}
                serviceType={serviceType}
                serviceHours={serviceHours}
                discountAmount={orderData.discountAmount}
                discountCode={orderData.discountCode}
                datetime={dateTimeValue}
                location={locationValue}
                goToTimeStep={() => goToStep(3)}
                goToLocationStep={() => goToStep(2)}
                setDiscountCode={setDiscountCode}
                applyDiscount={applyDiscount}
                handlePayment={submitOrder}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
