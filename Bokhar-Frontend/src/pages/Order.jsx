import { useReducer, useEffect, useCallback, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import Factor from "../components/orders/Factor";
import DateTimeRangePicker from "../components/orders/time/DateTimeRangePicker";
import MapSelector from "../components/orders/map/MapSelector.jsx";
import Payment from "../components/orders/Payment";
import StepProgress from "../components/orders/StepProgress";
import { getOrderSummary, toGregorian, TIME_SLOT_MAP } from "../api/order";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext"; // ← اضافه شد
import AuthModal from "../components/auth/AuthModal"; // ← اضافه شد
import { addToCart, clearCart } from "../api/cartService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

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
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_MAX_STEP":
      return { ...state, maxStep: action.payload };
    case "SET_ORDER_DATA":
      return { ...state, orderData: { ...state.orderData, ...action.payload } };
    case "RESET_ORDER":
      return { ...initialState, step: 1, maxStep: 1 };
    default:
      return state;
  }
}

export default function Order() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, maxStep, orderData } = state;
  const [summary, setSummary] = useState(null);
  const { cartItems, isGuest } = useCart();
  const { isAuthenticated, verifyAuth, loading: authLoading } = useAuth(); // ← اضافه شد
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // ← اضافه شد
  const [pendingStep, setPendingStep] = useState(null); // ← برای نگهداری استپی که کاربر می‌خواست بره
  const location = orderData?.location;

  const stepType = useCallback((s) => STEP_MAP[s] || null, []);

  // ✅ اضافه شده: چک کردن احراز هویت قبل از رفتن به مراحل ۲، ۳، ۴
  const requireAuthForStep = useCallback(async (targetStep) => {
    // مرحله ۱ نیاز به چک نداره (چون خودش مودال داره)
    if (targetStep === 1) return true;
    
    // اگه لاگینه، اوکیه
    if (isAuthenticated) return true;
    
    // در غیر این صورت وریفای کن
    await verifyAuth();
    
    // دوباره چک کن
    if (isAuthenticated) return true;
    
    // لاگین نیست — برگرد به مرحله ۱ و مودال باز کن
    dispatch({ type: "SET_STEP", payload: 1 });
    setPendingStep(targetStep);
    setIsAuthModalOpen(true);
    return false;
  }, [isAuthenticated, verifyAuth]);

  useEffect(() => {
    dispatch({ type: "SET_ORDER_DATA", payload: { cartItems } });
  }, [cartItems]);

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

  const dateTimeValue = useMemo(() => orderData.datetime, [orderData.datetime]);
  const locationValue = useMemo(() => orderData.location, [orderData.location]);

  // ✅ اصلاح شده: goToStep حالا auth رو هم چک می‌کنه
  const goToStep = useCallback(async (targetStep) => {
    const authorized = await requireAuthForStep(targetStep);
    if (!authorized) return;
    
    if (targetStep <= maxStep && targetStep >= 1) {
      dispatch({ type: "SET_STEP", payload: targetStep });
    }
  }, [maxStep, requireAuthForStep]);

  // ✅ اصلاح شده: handleNext حالا auth رو هم چک می‌کنه
  const handleNext = useCallback(async () => {
    const currentType = stepType(step);

    if (currentType === "location") {
      const { location } = orderData;
      if (!location?.coords || !location?.plaque || !location?.unit) {
        toast.error("لطفاً موقعیت مکانی را کامل انتخاب کنید.");
        return;
      }
    }

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
      
      // ✅ چک کردن لاگین قبل از رفتن به مرحله بعد
      const authorized = await requireAuthForStep(nextStep);
      if (!authorized) return;
      
      dispatch({ type: "SET_STEP", payload: nextStep });
      if (nextStep > maxStep) {
        dispatch({ type: "SET_MAX_STEP", payload: nextStep });
      }
    }
  }, [step, maxStep, orderData, stepType, requireAuthForStep]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      dispatch({ type: "SET_STEP", payload: step - 1 });
    }
  }, [step]);

  // ✅ اصلاح شده: handleStepClick حالا auth رو هم چک می‌کنه
  const handleStepClick = useCallback(async (clickedStep) => {
    if (clickedStep <= maxStep) {
      const authorized = await requireAuthForStep(clickedStep);
      if (!authorized) return;
      
      dispatch({ type: "SET_STEP", payload: clickedStep });
    }
  }, [maxStep, requireAuthForStep]);

  const handleDateTimeChange = useCallback((datetime) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { datetime } });
  }, []);

  const saveAddressToBackend = useCallback(async (locationData) => {
    try {
      const addressParts = locationData.address?.split("،") || [];
      const city = addressParts[0]?.trim() || "";
      const addressDetail = addressParts.slice(1).join("،").trim() || locationData.address;

      const payload = {
        title: locationData.title || "آدرس",
        city: city,
        address: addressDetail,
        apartment_name: locationData.plaque || "",
        unit: Number(locationData.unit) || 1,
      };

      console.log("ADDRESS PAYLOAD:", payload);

      const response = await api.post("/order/address/create/", payload);
      
      return {
        ...locationData,
        id: response.data.id,
      };
    } catch (err) {
      console.error("Save address error:", err.response?.data || err.message);
      toast.error(
        err.response?.data?.detail || 
        JSON.stringify(err.response?.data) || 
        "خطا در ذخیره آدرس"
      );
      return null;
    }
  }, []);

  const handleLocationSelect = useCallback(async (location) => {
    console.log("SELECTED LOCATION", location);

    const savedLocation = await saveAddressToBackend(location);
    if (savedLocation) {
      dispatch({ type: "SET_ORDER_DATA", payload: { location: savedLocation } });
    }
  }, [saveAddressToBackend]);

  // ✅ اصلاح شده: goToTimeStep حالا auth رو هم چک می‌کنه
  const goToTimeStep = useCallback(async () => {
    // ✅ چک کردن لاگین قبل از رفتن به مرحله ۲
    const authorized = await requireAuthForStep(2);
    if (!authorized) return;
    
    const nextStep = 2;
    dispatch({ type: "SET_STEP", payload: nextStep });
    if (nextStep > maxStep)
      dispatch({ type: "SET_MAX_STEP", payload: nextStep });
  }, [maxStep, requireAuthForStep]);

  // ✅ هندل کردن لاگین موفق — برگرد به استپ pending
  const handleAuthSuccess = useCallback(() => {
    setIsAuthModalOpen(false);
    // اگه استپی pending داشتیم، برو اونجا
    if (pendingStep && pendingStep > 1) {
      dispatch({ type: "SET_STEP", payload: pendingStep });
      if (pendingStep > maxStep) {
        dispatch({ type: "SET_MAX_STEP", payload: pendingStep });
      }
      setPendingStep(null);
    }
  }, [pendingStep, maxStep]);

  const setDiscountCode = useCallback((code) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { discountCode: code } });
  }, []);

  // ... بقیه کد بدون تغییر ...

  const applyDiscount = useCallback(async () => {
    try {
      const pickupShiftMapped = TIME_SLOT_MAP[orderData.datetime?.delivery?.time];
      const deliveryShiftMapped = TIME_SLOT_MAP[orderData.datetime?.pickup?.time];

      const data = await getOrderSummary({
        pickup_date: toGregorian(orderData.datetime?.delivery?.date),
        pickup_shift: pickupShiftMapped,
        delivery_date: toGregorian(orderData.datetime?.pickup?.date),
        delivery_shift: deliveryShiftMapped,
        coupon_code: orderData.discountCode || "",
        address_id: orderData.location?.id,
        cart_items: orderData.cartItems?.map(item => ({
          service_item_id: item.productId || item.id || item.product_id,
          quantity: item.qty || item.quantity || 1,
          material: item.material || "نخ",
          size: item.size || null,
        })) || [],
      });

      setSummary(data);
      toast.success("تخفیف اعمال شد 🎉");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("کد تخفیف نامعتبر است ❌");
      return false;
    }
  }, [orderData]);

  const handlePayment = useCallback(async () => {
    try {
      let addressId = orderData.location?.id;
      
      if (!addressId && orderData.location) {
        const saved = await saveAddressToBackend(orderData.location);
        if (saved) {
          addressId = saved.id;
          dispatch({ type: "SET_ORDER_DATA", payload: { location: saved } });
        }
      }

      if (!addressId) {
        toast.error("لطفاً ابتدا آدرس را انتخاب و ذخیره کنید");
        return;
      }

      if (isGuest) {
        toast.error("لطفاً ابتدا وارد حساب کاربری شوید");
        return;
      }

      try {
        await clearCart();
        for (const item of orderData.cartItems) {
          await addToCart(
            item.productId || item.product_id,
            item.qty || item.quantity || 1,
            {
              service: item.service || "-",
              material: item.material || "-",
              size: item.size,
              price: item.unitPrice || item.price || 0,
              product_name: item.name || item.product_name || "",
            }
          );
        }
      } catch (syncErr) {
        console.error("Cart sync warning:", syncErr);
      }

      const pickupShiftMapped = TIME_SLOT_MAP[orderData.datetime?.delivery?.time];
      const deliveryShiftMapped = TIME_SLOT_MAP[orderData.datetime?.pickup?.time];

      if (!pickupShiftMapped || !deliveryShiftMapped) {
        toast.error("شیفت زمانی نامعتبر است");
        return;
      }

      const payload = {
        address_id: addressId,
        
        pickup_date: toGregorian(orderData.datetime?.delivery?.date),
        pickup_shift: pickupShiftMapped,
        
        delivery_date: toGregorian(orderData.datetime?.pickup?.date),
        delivery_shift: deliveryShiftMapped,
        
        coupon_code: orderData.discountCode || "",
        description: "",
        
        cart_items: orderData.cartItems?.map(item => ({
          service_item_id: item.productId || item.id || item.product_id,
          quantity: item.qty || item.quantity || 1,
          pricing_tab_id: item.pricing_tab_id || null,
          material: item.material || "نخ",
          size: item.size || null,
        })) || [],
      };

      console.log("PAYMENT PAYLOAD:", JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${API_URL}/payments/initiate/`,
        payload,
        { withCredentials: true }
      );

      const { payment_url } = response.data;
      if (payment_url) {
        window.location.href = payment_url;
      } else {
        toast.error("لینک پرداخت دریافت نشد.");
      }
    } catch (err) {
      console.error("PAYMENT ERROR:", err);
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", JSON.stringify(err.response?.data, null, 2));
      
      const errorData = err.response?.data;
      let errorMsg = "خطا در شروع پرداخت";
      
      if (errorData?.non_field_errors) {
        errorMsg = errorData.non_field_errors[0];
      } else if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
        const firstError = Object.entries(errorData)[0];
        errorMsg = `${firstError[0]}: ${Array.isArray(firstError[1]) ? firstError[1][0] : firstError[1]}`;
      }
      
      toast.error(errorMsg);
    }
  }, [orderData, saveAddressToBackend, dispatch, isGuest]);

  const loadSummary = useCallback(async () => {
    console.log("========== LOAD SUMMARY ==========");
    console.log("ORDER DATA:", orderData);
    console.log("LOCATION DATA:", orderData.location);
    console.log("CART ITEMS COUNT:", orderData.cartItems?.length || 0);

    if (!location?.address) return;
    if (!location?.id) {
      console.warn("Location selected but no address_id yet.");
      return;
    }

    const pickupShiftMapped = TIME_SLOT_MAP[orderData.datetime?.delivery?.time];
    const deliveryShiftMapped = TIME_SLOT_MAP[orderData.datetime?.pickup?.time];

    const payload = {
      pickup_date: toGregorian(orderData.datetime?.delivery?.date),
      pickup_shift: pickupShiftMapped,
      delivery_date: toGregorian(orderData.datetime?.pickup?.date),
      delivery_shift: deliveryShiftMapped,
      coupon_code: orderData.discountCode || "",
      address_id: orderData.location?.id,
      amount: (summary?.final_price || 0) * 10,
      cart_items: orderData.cartItems?.map(item => ({
        service_item_id: item.productId || item.id || item.product_id,
        quantity: item.qty || item.quantity || 1,
        material: item.material || "نخ",
        size: item.size || null,
      })) || [],
    };

    console.log("SUMMARY PAYLOAD:", payload);

    try {
      const data = await getOrderSummary(payload);
      console.log("SUMMARY RESPONSE:", data);
      setSummary(data);
    } catch (err) {
      console.log("========== SUMMARY ERROR ==========");
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);
      console.log("NON FIELD:", err.response?.data?.non_field_errors);

      if (err.response?.data?.non_field_errors) {
        toast.error(err.response.data.non_field_errors[0]);
      }
    }
  }, [orderData]);

  useEffect(() => {
    if (!location?.address) return;
    if (!location?.id) {
      console.warn("Location selected but no address_id yet.");
      return;
    }
    loadSummary();
  }, [location, orderData.datetime, orderData.discountCode]);

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
            {stepType(step) === "factor" && (
              <Factor goToTimeStep={goToTimeStep} />
            )}

            {stepType(step) === "location" && (
              <MapSelector
                initialPosition={locationValue?.coords}
                initialAddress={locationValue?.address || ""}
                onLocationSelect={handleLocationSelect}
                goToNextStep={handleNext}
                goToPrevStep={handleBack}
              />
            )}

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

            {stepType(step) === "payment" && (
              <Payment
                subtotal={summary?.items_price || 0}
                pickupCost={(summary?.pickup_cost || 0) + (summary?.delivery_cost || 0)}
                rushFee={summary?.rush_fee || 0}
                discountAmount={summary?.discount || 0}
                total={summary?.final_price || 0}
                discountCode={orderData.discountCode}
                datetime={dateTimeValue}
                location={locationValue}
                goToTimeStep={() => goToStep(3)}
                goToLocationStep={() => goToStep(2)}
                setDiscountCode={setDiscountCode}
                applyDiscount={applyDiscount}
                handlePayment={handlePayment}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ✅ اضافه شده: مودال لاگین سراسری برای Order */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingStep(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}