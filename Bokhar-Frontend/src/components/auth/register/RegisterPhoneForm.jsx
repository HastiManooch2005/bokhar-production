import { useState } from "react";
import { PhoneIcon } from "@heroicons/react/24/solid";
import PhoneInputBoxes from "../ui/PhoneInputBoxes";
import toast from "react-hot-toast";
import { sendRegisterOtp } from "../../../api/apiClient";

export default function RegisterPhoneForm({ onNext, onSwitchLogin }) {
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // تابع کمکی برای چک کردن فارسی بودن متن
  const isPersianText = (text) => {
    // اجازه حروف فارسی (unicode: \u0600-\u06FF)، فاصله و نیم‌فاصله (ZWNJ)
    return /^[\u0600-\u06FF\s‌]+$/.test(text);
  };

  const handleNext = async () => {
    if (loading) return;

    const trimmedName = fullname.trim();

    if (!trimmedName) {
      return toast.error("نام و نام خانوادگی را وارد کنید");
    }

    // اعتبارسنجی فارسی بودن
    if (!isPersianText(trimmedName)) {
      return toast.error("نام و نام خانوادگی باید فارسی باشد");
    }

    if (!/^09\d{9}$/.test(phone)) {
      return toast.error("شماره موبایل باید با 09 شروع شده و 11 رقم باشد");
    }

    setLoading(true);

    try {
      await sendRegisterOtp(phone);
      toast.success("کد تایید ارسال شد");

      onNext({
        phone,
        fullname: trimmedName,
      });
    } catch (err) {
      toast.error(err?.message || "خطا در ارسال کد");
    } finally {
      setLoading(false);
    }
  };

  // فیلتر کردن ورودی کاربر (جلوگیری از تایپ کاراکترهای غیرفارسی)
  const handleNameChange = (e) => {
    const value = e.target.value;
    // فقط حروف فارسی، فاصله و نیم‌فاصله مجاز است
    if (value === '' || /^[\u0600-\u06FF\s‌]*$/.test(value)) {
      setFullname(value);
    } else {
      // اگر کاراکتر غیرمجاز وارد شد، به کاربر اطلاع بده (اختیاری)
      toast.error("لطفاً فقط از حروف فارسی استفاده کنید", {
        id: 'persian-error',
        duration: 1000
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-2 sm:p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
        ثبت‌نام
      </h2>

      <div className="flex items-center gap-2 mb-3">
        <PhoneIcon className="w-5 h-5 text-gray-500 dark:text-gray-100" />
        <span className="text-gray-600 dark:text-gray-100 text-sm">
          اطلاعات خود را وارد کنید
        </span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        {/* Fullname */}
        <input
          value={fullname}
          onChange={handleNameChange}
          placeholder="نام و نام خانوادگی"
          className="
            w-full border-b p-2 mb-6
            bg-transparent
            text-gray-800 dark:text-gray-100
            focus:border-blue-500 dark:focus:border-purple-600 focus:border-b-2 outline-none
          "
        />

        {/* Phone */}
        <PhoneInputBoxes
          value={phone}
          onChange={(val) => setPhone(val.replace(/\D/g, ""))}
        />

        <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-center">
          شماره همراه خود را وارد بفرمایید
        </p>

        <button
          type="submit"
          disabled={loading || phone.length < 11 || !fullname.trim()}
          className={`w-full mt-6 py-3 rounded-xl text-white font-medium flex justify-center items-center gap-2 transition ${
            loading || phone.length < 11 || !fullname.trim()
              ? "bg-blue-400 dark:bg-purple-500 cursor-not-allowed"
              : "bg-blue-600 dark:bg-purple-700 hover:bg-blue-700 dark:hover:bg-purple-900"
          }`}
        >
          {loading && (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
        </button>
      </form>

      <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-200">
        حساب دارید؟{" "}
        <button
          onClick={onSwitchLogin}
          className="text-blue-600 hover:underline dark:text-purple-400"
        >
          ورود
        </button>
      </p>
    </div>
  );
}