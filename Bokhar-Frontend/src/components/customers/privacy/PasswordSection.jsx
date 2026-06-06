import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  Info,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// -----------------------------------------------------------------------------
// 1. CUSTOM HOOK: Extract all business logic
// -----------------------------------------------------------------------------
const usePasswordManager = ({ user, refreshUser, API_BASE, getCSRFToken }) => {
  const hasPassword = Boolean(user?.has_password);

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [useOtp, setUseOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  const sendOTP = useCallback(async () => {
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/send/otp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify({ phone: user?.phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "خطا در ارسال کد");

      setOtpSent(true);
      setOtpTimer(120);
      setSuccess("کد تایید به شماره موبایل شما ارسال شد");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }, [user, API_BASE, getCSRFToken]);

  const verifyOTP = useCallback(
    async (code) => {
      if (!code || code.length !== 5) {
        setError("کد ۵ رقمی را کامل وارد کنید");
        return;
      }

      setOtpLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/verify/otp/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
          },
          credentials: "include",
          body: JSON.stringify({ phone: user?.phone, code }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "کد وارد شده صحیح نیست");

        setOtpVerified(true);
        setSuccess("کد تایید شد. اکنون رمز جدید را ثبت کنید.");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError(err.message);
      } finally {
        setOtpLoading(false);
      }
    },
    [user, API_BASE, getCSRFToken]
  );

  const handlePasswordChange = useCallback(async () => {
    setError("");
    setSuccess("");

    const data = hasPassword
      ? useOtp
        ? { otp_code: otp, password: password.new, password2: password.confirm }
        : {
            old_password: password.current,
            password: password.new,
            password2: password.confirm,
          }
      : { password: password.new, password2: password.confirm };

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/edit/password/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        const msg =
          result.detail ||
          result.old_password?.[0] ||
          result.password?.[0] ||
          result.password2?.[0] ||
          result.otp_code?.[0] ||
          "خطای اعتبارسنجی";
        throw new Error(msg);
      }

      setSuccess("رمز عبور با موفقیت تغییر کرد!");
      setPassword({ current: "", new: "", confirm: "" });
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
      setUseOtp(false);
      refreshUser?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasPassword, useOtp, otp, password, API_BASE, getCSRFToken, refreshUser]);

  // Validation
  const isPasswordFormValid = hasPassword
    ? useOtp
      ? otpVerified &&
        password.new.trim().length >= 8 &&
        password.new === password.confirm
      : password.current.trim() !== "" &&
        password.new.trim().length >= 8 &&
        password.new === password.confirm
    : password.new.trim().length >= 8 && password.new === password.confirm;

  // Strength calculation
  const getStrength = (pwd) => {
    if (!pwd || pwd.length === 0) return null;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    const hasLength = pwd.length >= 8;

    let criteria = 0;
    if (hasLower) criteria++;
    if (hasUpper) criteria++;
    if (hasNumber) criteria++;
    if (hasSpecial) criteria++;

    if (!hasLength || criteria < 2)
      return { label: "ضعیف", color: "bg-red-500", percent: 25 };
    if (criteria === 2)
      return { label: "متوسط", color: "bg-yellow-500", percent: 50 };
    if (criteria === 3)
      return { label: "خوب", color: "bg-blue-500", percent: 75 };
    if (criteria === 4 && hasLength)
      return { label: "قوی", color: "bg-emerald-500", percent: 100 };
    return { label: "خوب", color: "bg-blue-500", percent: 75 };
  };

  return {
    // State
    hasPassword,
    password,
    setPassword,
    useOtp,
    setUseOtp,
    otp,
    setOtp,
    otpSent,
    otpVerified,
    otpLoading,
    otpTimer,
    loading,
    error,
    success,
    isPasswordFormValid,
    strength: getStrength(password.new),
    // Actions
    sendOTP,
    verifyOTP,
    handlePasswordChange,
    setError,
    setSuccess,
  };
};

// -----------------------------------------------------------------------------
// 2. UI COMPONENTS
// -----------------------------------------------------------------------------

// Glassmorphism Card Container - Updated to match SessionsSection
const GlassCard = ({ children, className = "rounded-2xl shadow-lg shadow-sky-200" }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {/* Ambient Glow Background - Softer like SessionsSection */}
    
    {/* Card Body */}
    <div className="relative bg-sky-50 dark:bg-gray-900/40 border border-sky-200 dark:border-white/10 rounded-2xl ">
      {children}
    </div>
  </div>
);

// Reusable Input with Glassmorphism styling
const CustomInput = ({
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  className = "",
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <Icon size={18} />
        </div>
      )}
      <input
        type={inputType}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white/50 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50 
          rounded-xl py-3 ${Icon ? "pl-10" : "pl-4"} pr-10
          text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50
          transition-all duration-200 backdrop-blur-sm
          ${error ? "border-red-500/50 focus:ring-red-500/30" : ""}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
};

// 5-Digit OTP Grid with Auto-focus
const OtpInput = ({ value, onChange, disabled, error }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, digit) => {
    if (!/^\d*$/.test(digit)) return;
    
    const newValue = value.split("");
    newValue[index] = digit;
    const combined = newValue.join("");
    onChange(combined);

    // Auto-focus next
    if (digit && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 5).replace(/\D/g, "");
    onChange(pasted);
    
    // Focus last filled or next empty
    const focusIndex = Math.min(pasted.length, 4);
    setTimeout(() => inputRefs.current[focusIndex]?.focus(), 0);
  };

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[0, 1, 2, 3, 4].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-12 h-14 text-center text-xl font-bold bg-white/60 dark:bg-black/20 
            border-2 rounded-xl focus:outline-none transition-all duration-200
            ${error ? "border-red-400 focus:border-red-500" : "border-gray-200/50 dark:border-gray-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"}
            dark:text-white disabled:opacity-50`}
        />
      ))}
    </div>
  );
};

// Animated Strength Bar
const StrengthBar = ({ strength }) => {
  if (!strength) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400">قدرت رمز عبور</span>
        <motion.span
          key={strength.label}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-bold ${
            strength.label === "قوی"
              ? "text-emerald-600 dark:text-emerald-400"
              : strength.label === "خوب"
              ? "text-blue-600 dark:text-blue-400"
              : strength.label === "متوسط"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {strength.label}
        </motion.span>
      </div>
      <div className="h-1.5 w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${strength.percent}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className={`h-full ${strength.color} rounded-full`}
        />
      </div>
    </div>
  );
};

// Shimmer Loading Button
const ActionButton = ({ onClick, disabled, loading, children, variant = "primary" }) => {
  const baseStyles = "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-900/20",
    secondary: "bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/10",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
             style={{ backgroundSize: "200% 100%" }} />
      )}
      {loading ? (
        <RefreshCw className="animate-spin" size={18} />
      ) : (
        children
      )}
    </button>
  );
};

// -----------------------------------------------------------------------------
// 3. MAIN COMPONENT
// -----------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL;

function getCSRFToken() {
  const match = document.cookie.match(/csrftoken=([\w-]+)/);
  return match ? match[1] : "";
}

export default function PasswordSection() {
  // In a real app, get this from your context
  const { user, refreshUser } = { user: { has_password: true, phone: "09123456789" }, refreshUser: () => {} };
  
  const {
    hasPassword,
    password,
    setPassword,
    useOtp,
    setUseOtp,
    otp,
    setOtp,
    otpSent,
    otpVerified,
    otpLoading,
    otpTimer,
    loading,
    error,
    success,
    isPasswordFormValid,
    strength,
    sendOTP,
    verifyOTP,
    handlePasswordChange,
    setError,
  } = usePasswordManager({ user, refreshUser, API_BASE, getCSRFToken });

  const [showRules, setShowRules] = useState(false);

  return (
    <div className="w-full max-w-lg mx-auto ">
      <GlassCard>
        <div className="p-6 md:p-8 space-y-6  ">
          
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200/30 dark:border-white/5">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
              <Lock className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {hasPassword ? "تغییر رمز عبور" : "تنظیم رمز عبور"}
            </h2>
          </div>

          {/* Notifications */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/20 text-red-700 dark:text-red-300 text-sm"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm"
              >
                <CheckCircle size={16} className="shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auth Method Selection */}
          {hasPassword && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                روش تایید هویت
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/50 dark:bg-black/20 rounded-xl">
                <button
                  onClick={() => {
                    setUseOtp(false);
                    setOtp("");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    !useOtp
                      ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Lock size={16} />
                  رمز فعلی
                </button>
                <button
                  onClick={() => {
                    setUseOtp(true);
                    setPassword((p) => ({ ...p, current: "" }));
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    useOtp
                      ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Shield size={16} />
                  کد تایید (OTP)
                </button>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="space-y-4 ">
            
            {/* Current Password (non-OTP mode) */}
            <AnimatePresence>
              {hasPassword && !useOtp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <CustomInput
                    type="password"
                    placeholder="رمز عبور فعلی"
                    value={password.current}
                    onChange={(e) =>
                      setPassword((p) => ({ ...p, current: e.target.value }))
                    }
                    icon={Lock}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Section */}
            <AnimatePresence>
              {hasPassword && useOtp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {!otpVerified ? (
                    <>
                      {!otpSent ? (
                        <ActionButton
                          onClick={sendOTP}
                          loading={otpLoading}
                          disabled={otpLoading}
                          variant="secondary"
                        >
                          <Shield size={18} />
                          ارسال کد به {user?.phone}
                        </ActionButton>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 p-4 bg-white/30 dark:bg-white/5 rounded-xl border border-white/20"
                        >
                          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                            کد ۵ رقمی ارسال شده را وارد کنید
                          </p>
                          
                          <OtpInput
                            value={otp}
                            onChange={setOtp}
                            disabled={otpLoading}
                            error={error}
                          />

                          <div className="flex gap-2">
                            <ActionButton
                              onClick={() => verifyOTP(otp)}
                              disabled={otp.length !== 5 || otpLoading}
                              loading={otpLoading}
                              variant="success"
                            >
                              تایید کد
                            </ActionButton>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <button
                              onClick={sendOTP}
                              disabled={otpTimer > 0 || otpLoading}
                              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {otpTimer > 0
                                ? `ارسال مجدد (${otpTimer}s)`
                                : "ارسال مجدد"}
                            </button>
                            <button
                              onClick={() => {
                                setUseOtp(false);
                                setOtpSent(false);
                                setOtp("");
                              }}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                              انصراف
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle size={20} />
                      <span className="font-medium">هویت شما تایید شد</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* New Password */}
            <div className="relative">
              <CustomInput
                type="password"
                placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)"
                value={password.new}
                onChange={(e) =>
                  setPassword((p) => ({ ...p, new: e.target.value }))
                }
                onFocus={() => setShowRules(true)}
                onBlur={() => setTimeout(() => setShowRules(false), 200)}
                icon={Lock}
              />
              
              {/* Password Rules Tooltip */}
              <AnimatePresence>
                {showRules && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-20 bottom-full mb-2 right-0 w-full p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl"
                  >
                    <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                      <Info size={16} />
                      <span>نکات امنیتی</span>
                    </div>
                    <ul className="space-y-2 text-xs">
                      {[
                        { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.new), label: "کاراکتر خاص" },
                        { test: /[a-z]/.test(password.new) && /[A-Z]/.test(password.new), label: "حروف بزرگ و کوچک" },
                        { test: /[0-9]/.test(password.new), label: "اعداد" },
                        { test: password.new.length >= 8, label: "حداقل ۸ کاراکتر" },
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <motion.div
                            animate={{
                              backgroundColor: item.test ? "#10b981" : "#e5e7eb",
                              scale: item.test ? 1 : 0.8,
                            }}
                            className="w-1.5 h-1.5 rounded-full"
                          />
                          <span className={item.test ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <StrengthBar strength={strength} />

            {/* Confirm Password */}
            <CustomInput
              type="password"
              placeholder="تکرار رمز عبور جدید"
              value={password.confirm}
              onChange={(e) =>
                setPassword((p) => ({ ...p, confirm: e.target.value }))
              }
              icon={Lock}
              error={
                password.confirm &&
                password.new !== password.confirm
              }
            />
            
            {password.confirm && password.new !== password.confirm && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-xs mt-1"
              >
                رمز عبور و تکرار آن مطابقت ندارند
              </motion.p>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <ActionButton
                onClick={handlePasswordChange}
                disabled={!isPasswordFormValid || loading}
                loading={loading}
              >
                {hasPassword ? "ذخیره تغییرات" : "تنظیم رمز عبور"}
              </ActionButton>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Shimmer animation styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
