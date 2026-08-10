import { useReducer, useEffect, useCallback, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import Factor from "../components/orders/Factor";
import DateTimeRangePicker from "../components/orders/time/DateTimeRangePicker";
import MapSelector from "../components/orders/map/MapSelector.jsx";
import Payment from "../components/orders/Payment";
import StepProgress from "../components/orders/StepProgress";
import { getOrderSummary, toGregorian } from "../api/order";  // ✅ FIX: Import toGregorian
import { useCart } from "../context/CartContext";

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
  const { cartItems } = useCart();
  const location = orderData?.location;

  const stepType = useCallback((s) => STEP_MAP[s] || null, []);

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

  const goToStep = useCallback((targetStep) => {
    if (targetStep <= maxStep && targetStep >= 1) {
      dispatch({ type: "SET_STEP", payload: targetStep });
    }
  }, [maxStep]);

  const handleNext = useCallback(() => {
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
        province: city,
        city: city,
        address_detail: addressDetail,
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

  const goToTimeStep = useCallback(() => {
    const nextStep = 2;
    dispatch({ type: "SET_STEP", payload: nextStep });
    if (nextStep > maxStep)
      dispatch({ type: "SET_MAX_STEP", payload: nextStep });
  }, [maxStep]);

  const setDiscountCode = useCallback((code) => {
    dispatch({ type: "SET_ORDER_DATA", payload: { discountCode: code } });
  }, []);

  const applyDiscount = useCallback(async () => {
    try {
      const data = await getOrderSummary({
        pickup_date: toGregorian(orderData.datetime?.pickup?.date),  // ✅ FIX
        pickup_shift: orderData.datetime?.pickup?.time,
        delivery_date: toGregorian(orderData.datetime?.delivery?.date),  // ✅ FIX
        delivery_shift: orderData.datetime?.delivery?.time,
        coupon_code: orderData.discountCode || "",
        address_id: orderData.location?.id,
        // ✅ FIX: Send rush_fee_amount from frontend pricing calculation
        rush_fee_amount: orderData.datetime?.pricing?.amount || 0,
        cart_items: orderData.cartItems?.map(item => ({
          service_item_id: item.productId || item.id,
          quantity: item.qty || item.quantity || 1,
          unit_price: item.unitPrice || item.price || 0,
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
      const response = await axios.post(
        `${API_URL}/payments/initiate/`,
        orderData,
        { withCredentials: true }
      );
      const { payment_url } = response.data;
      if (payment_url) {
        window.location.href = payment_url;
      } else {
        toast.error("خطا در دریافت لینک پرداخت.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در شروع پرداخت. لطفاً دوباره تلاش کنید.");
    }
  }, [orderData]);

  const loadSummary = useCallback(async () => {
    console.log("========== LOAD SUMMARY ==========");
    console.log("ORDER DATA:", orderData);
    console.log("LOCATION DATA:", orderData.location);
    console.log("CART ITEMS COUNT:", orderData.cartItems?.length || 0);

    const payload = {
      pickup_date: toGregorian(orderData.datetime?.pickup?.date),  // ✅ FIX
      pickup_shift: orderData.datetime?.pickup?.time,
      delivery_date: toGregorian(orderData.datetime?.delivery?.date),  // ✅ FIX
      delivery_shift: orderData.datetime?.delivery?.time,
      coupon_code: orderData.discountCode || "",
      address_id: orderData.location?.id,
      // ✅ FIX: Send rush_fee_amount from frontend pricing calculation
      // This ensures the backend uses the same rush fee that the user saw in the time picker
      rush_fee_amount: orderData.datetime?.pricing?.amount || 0,
      cart_items: orderData.cartItems?.map(item => ({
        service_item_id: item.productId || item.id,
        quantity: item.qty || item.quantity || 1,
        unit_price: item.unitPrice || item.price || 0,
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
    </div>
  );
}