import { useState, useEffect } from "react";
import OtpInput from "../ui/OtpInput";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

export default function RegisterOtpForm({ phone, fullname, onBack, onSuccess }) {
  const { registerWithOTP } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const canResend = timer === 0;

  /* ---------------- Countdown timer ---------------- */
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  /* ---------------- Verify OTP + Register ---------------- */
  const handleVerify = async () => {
    if (loading) return;

    if (!/^\d{5,6}$/.test(otp)) {
      return toast.error("کد تأیید معتبر نیست");
    }

    setLoading(true);
    try {
      // ✅ فراخوانی مستقیم کانتکست برای ثبت‌نام و آپدیت user
      await registerWithOTP({ phone, otp, fullname });

      toast.success(`🎉 خوش آمدی ${fullname}! ثبت‌نام با موفقیت انجام شد`, {
        duration: 4000,
        position: "top-center",
      });

      onSuccess(); // مودال بسته می‌شود و Navbar آپدیت می‌شود
    } catch (err) {
      let message = "خطا در تأیید کد";
      if (err?.message) message = err.message;
      else if (err?.detail) message = err.detail;
      else if (typeof err === "object") message = Object.values(err).flat().join(" | ");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Resend OTP ---------------- */
  const handleResend = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    try {
      // ارسال مجدد OTP از همان API
      await fetch(`${import.meta.env.VITE_API_URL}/send/otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      toast.success("کد تأیید دوباره ارسال شد ✅");
      setTimer(60);
    } catch (err) {
      let message = "خطا در ارسال مجدد کد";
      if (err?.message) message = err.message;
      else if (typeof err === "object") message = Object.values(err).flat().join(" | ");
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-2 sm:p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
        کد تأیید
      </h2>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        کد ارسال‌شده به شماره <span className="font-medium">{phone}</span> را وارد کنید
      </p>

      <OtpInput value={otp} onChange={(val) => setOtp(val.replace(/\D/g, ""))} />

      <button
        onClick={handleVerify}
        disabled={loading || otp.length < 5}
        className={`w-full mt-6 py-3 rounded-xl text-white font-medium flex justify-center items-center gap-2 transition ${
          loading || otp.length < 5
            ? "bg-blue-400 dark:bg-purple-500 cursor-not-allowed"
            : "bg-blue-600 dark:bg-purple-700 hover:bg-blue-700 dark:hover:bg-purple-900"
        }`}
      >
        {loading && (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? "در حال بررسی..." : "تأیید و ثبت‌نام"}
      </button>

      <p className="text-center mt-4 text-sm text-gray-500">
        {!canResend ? (
          <>ارسال مجدد تا {timer} ثانیه دیگر</>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="text-blue-600 dark:text-purple-400 hover:underline"
          >
            {resendLoading ? "در حال ارسال..." : "ارسال مجدد کد"}
          </button>
        )}
      </p>

      <button
        onClick={onBack}
        className="block mx-auto mt-4 text-blue-600 dark:text-purple-400 hover:underline"
      >
        بازگشت
      </button>
    </div>
  );
}
