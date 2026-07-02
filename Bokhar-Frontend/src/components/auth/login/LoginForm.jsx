import { useState, useEffect } from "react"; // ← useEffect اضافه شد
import PhoneInputBoxes from "../ui/PhoneInputBoxes";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import OtpInput from "../ui/OtpInput";
import { PhoneIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../../../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL;

// فقط برای ارسال OTP (لاگین نیست)
async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("RAW RESPONSE:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("❌ Response is not JSON!", err);
    throw { detail: "Server did not return JSON", raw: text };
  }

  if (!res.ok) throw data;
  return data;
}

export default function LoginForm({ onSwitchRegister, onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // login | otp-phone | otp-verify
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  // ← استیت‌های جدید برای تایمر
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { loginWithPassword, loginWithOTP } = useAuth();

  // ← شروع تایمر هنگام ورود به مرحله تایید OTP
  useEffect(() => {
    if (mode === "otp-verify") {
      setTimer(60);
      setCanResend(false);
    }
  }, [mode]);

  // ← مدیریت شمارنده معکوس
  useEffect(() => {
    let interval;
    if (mode === "otp-verify" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [mode, timer]);

  // ==================== ورود با رمز عبور ====================
  const handleLoginPassword = async () => {
    if (loading) return;

    if (!/^09\d{9}$/.test(phone)) {
      toast.error("شماره موبایل معتبر نیست");
      return;
    }
    if (!password) {
      toast.error("رمز عبور را وارد کنید");
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword({ phone, password });
      toast.success("ورود موفق ✅");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.detail || "شماره یا رمز اشتباه است");
    } finally {
      setLoading(false);
    }
  };

  // ==================== ارسال OTP ====================
  const handleSendOtp = async () => {
    if (!/^09\d{9}$/.test(phone)) {
      toast.error("شماره موبایل معتبر نیست");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/send/otp/", { phone });
      toast.success("کد OTP ارسال شد");
      setMode("otp-verify");
      // تایمر در useEffect بالا خودکار ریست می‌شود
    } catch (err) {
      toast.error(err?.detail || "خطا در ارسال OTP");
    } finally {
      setLoading(false);
    }
  };

  // ← ارسال مجدد کد OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;

    setLoading(true);
    try {
      await apiPost("/send/otp/", { phone });
      toast.success("کد جدید ارسال شد");
      setTimer(60);
      setCanResend(false);
      setOtp(""); // پاک کردن کد قبلی
    } catch (err) {
      toast.error(err?.detail || "خطا در ارسال مجدد کد");
    } finally {
      setLoading(false);
    }
  };

  // ==================== تایید OTP ====================
  const handleVerifyOtp = async () => {
    if (otp.length !== 5) {
      toast.error("کد OTP باید 5 رقمی باشد");
      return;
    }

    setLoading(true);
    try {
      await loginWithOTP({ phone, otp });
      toast.success("ورود موفق ✅");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const message =
        (err && err.message) ||
        (err && err.otp) ||
        (err && err.پیام) ||
        "کد OTP اشتباه است";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== رندر فرم‌ها ====================
  return (
    <div className="max-w-md mx-auto p-1" dir="rtl">
      {/* ==================== ورود با رمز ==================== */}
{mode === "login" && (
  <>
    <h2 className="text-2xl font-bold text-center mb-6 md:my-6 text-gray-800 dark:text-gray-200">
      ورود به حساب کاربری
    </h2>

    <form onSubmit={(e) => { e.preventDefault(); handleLoginPassword(); }}>
      <div className="flex items-center gap-2 mb-1">
        <PhoneIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        <p className="text-gray-800 dark:text-gray-300 text-sm">
          شماره موبایل خود را وارد کنید:
        </p>
      </div>

      <PhoneInputBoxes
        value={phone}
        onChange={(val) => setPhone(val.replace(/\D/g, ""))}
      />

      <div className="mt-4 text-gray-800 dark:text-gray-200">رمز عبور:</div>

      <div className="relative">
        <input
          type={showPass ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-b p-1 pr-2 bg-transparent outline-none transition
           text-gray-800 border-gray-300 focus:border-blue-600 
           dark:border-gray-600 dark:focus:border-[#8AA1C4] dark:focus:border-b-2 dark:text-gray-200"
        />
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="absolute top-1/2 -translate-y-1/2 left-2 text-gray-500 dark:text-gray-300"
        >
          {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !/^09\d{9}$/.test(phone) || !password}
        className={`w-full py-3 mt-6 rounded-xl text-white font-medium flex justify-center items-center gap-2 transition shadow-lg ${
          loading || !/^09\d{9}$/.test(phone) || !password
            ? "bg-blue-400 dark:bg-[#262B40] cursor-not-allowed"
            : "bg-blue-600 dark:bg-[#8AA1C4] hover:bg-blue-700 dark:hover:bg-[#7a93b8]"
        }`}
      >
        {loading && (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        )}
        {loading ? "در حال ورود..." : "ورود"}
      </button>
    </form>

    <div className="flex justify-between items-center mt-6 text-sm text-gray-500 dark:text-gray-400">
      <button
        onClick={() => setMode("otp-phone")}
        className="text-blue-600 hover:underline dark:text-[#8AA1C4]"
      >
        ورود با رمز یک بار مصرف
      </button>
      <span className="text-gray-600 dark:text-gray-300">
        حساب ندارید؟{" "}
        <button
          onClick={onSwitchRegister}
          className="text-blue-600 hover:underline dark:text-[#8AA1C4]"
        >
          ثبت نام
        </button>
      </span>
    </div>
  </>
)}

      {/* ==================== فرم شماره برای OTP ==================== */}
{mode === "otp-phone" && (
  <>
    <h2 className="text-xl font-bold mb-4 text-center dark:text-gray-200">
      ورود با رمز یک بار مصرف
    </h2>

    <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
      <div className="flex items-center gap-2 mb-1">
        <PhoneIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        <p className="text-gray-800 dark:text-gray-300 text-sm">
          شماره موبایل خود را وارد کنید:
        </p>
      </div>

      <PhoneInputBoxes
        value={phone}
        onChange={(val) => setPhone(val.replace(/\D/g, ""))}
      />

      <button
        type="submit"
        disabled={loading || !/^09\d{9}$/.test(phone)}
        className={`w-full py-3 mt-6 rounded-xl text-white font-medium flex justify-center items-center gap-2 ${
          loading || !/^09\d{9}$/.test(phone)
            ? "bg-blue-400 dark:bg-[#262B40] cursor-not-allowed"
            : "bg-blue-600 dark:bg-[#8AA1C4] hover:bg-blue-700 dark:hover:bg-[#7a93b8]"
        }`}
      >
        {loading ? "در حال ارسال..." : "ارسال پیامک"}
      </button>
    </form>

    <button
      onClick={() => setMode("login")}
      className="mt-4 w-full text-center text-gray-600 hover:underline dark:text-gray-400"
    >
      بازگشت
    </button>
  </>
)}

      {/* ==================== تایید OTP ==================== */}
{mode === "otp-verify" && (
  <>
    <h2 className="text-xl font-bold my-4 text-center dark:text-gray-200">
      کد ارسال شده را وارد کنید
    </h2>

    <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-4">
      کد ۵ رقمی به شماره{" "}
      <span className="font-bold text-gray-800 dark:text-gray-200">
        {phone}
      </span>{" "}
      ارسال شد
    </p>

    <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
      <OtpInput value={otp} onChange={setOtp} />

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 mt-6 rounded-xl text-white font-medium flex justify-center items-center gap-2 ${
          loading
            ? "bg-blue-400 cursor-not-allowed dark:bg-[#262B40]"
            : "bg-blue-600 hover:bg-blue-700 dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8]"
        }`}
      >
        {loading ? "در حال تایید..." : "تایید کد ارسال شده"}
      </button>
    </form>

    {/* بخش شمارنده و ارسال مجدد */}
    <div className="mt-4 text-center">
      {timer > 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          ارسال مجدد کد تا{" "}
          <span className="font-bold text-blue-600 dark:text-[#8AA1C4]">
            {timer}
          </span>{" "}
          ثانیه دیگر
        </p>
      ) : (
        <button
          onClick={handleResendOtp}
          disabled={loading}
          className="text-blue-600 hover:underline dark:text-[#8AA1C4] text-sm font-medium disabled:opacity-50"
        >
          ارسال مجدد کد
        </button>
      )}
    </div>
    <div className="flex items-center justify-center mt-4">
      <span className="text-gray-600 dark:text-gray-400 text-sm px-1">
        شماره موبایل اشتباه است؟
      </span>
      <button
        onClick={() => setMode("otp-phone")}
        className="text-blue-600 hover:underline dark:text-[#8AA1C4] text-sm"
      >
        تغییر شماره موبایل
      </button>
    </div>
  </>
)}
    </div>
  );
}