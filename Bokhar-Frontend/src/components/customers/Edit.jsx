import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import toast from "react-hot-toast"; // اگر دارید، یا می‌تونید از setError استفاده کنید

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, verifyAuth, loading } = useAuth();
  const { editFullName } = useProfile();

  const [fullname, setFullname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ================= theme (همون قبلی)
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ================= گرفتن دیتا از auth
  useEffect(() => {
    if (user?.fullname) setFullname(user.fullname);
  }, [user]);

  // تابع کمکی برای چک کردن فارسی بودن متن
  const isPersianText = (text) => {
    // اجازه حروف فارسی (unicode: \u0600-\u06FF)، فاصله و نیم‌فاصله (ZWNJ)
    return /^[\u0600-\u06FF\s‌]+$/.test(text);
  };

  // فیلتر کردن ورودی کاربر (جلوگیری از تایپ کاراکترهای غیرفارسی)
  const handleNameChange = (e) => {
    const value = e.target.value;
    // فقط حروف فارسی، فاصله و نیم‌فاصله مجاز است
    if (value === '' || /^[\u0600-\u06FF\s‌]*$/.test(value)) {
      setFullname(value);
      setError(null); // پاک کردن خطا هنگام تایپ صحیح
    } else {
      setError("لطفاً فقط از حروف فارسی استفاده کنید");
      // یا می‌توانید از toast استفاده کنید:
      // toast.error("لطفاً فقط از حروف فارسی استفاده کنید", { id: 'persian-error', duration: 2000 });
    }
  };

  const handleSave = async () => {
    const trimmedName = fullname.trim();
    
    if (!trimmedName) {
      setError("نام و نام خانوادگی نمی‌تواند خالی باشد");
      return;
    }

    // اعتبارسنجی فارسی بودن
    if (!isPersianText(trimmedName)) {
      setError("نام و نام خانوادگی باید فارسی باشد");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await editFullName(trimmedName);

      if (verifyAuth) await verifyAuth();
      
      toast.success("اطلاعات با موفقیت ذخیره شد"); // اگر toast دارید
    } catch (err) {
      setError(err?.message || "خطا در ذخیره اطلاعات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div
        className="
          bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950
          border border-sky-200 dark:border-sky-700
          rounded-2xl shadow p-4 md:max-w-3xl md:mx-auto mt-5 md:mt-15
        "
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-700 flex items-center justify-center text-2xl">
            👤
          </div>

          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ویرایش پروفایل
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              اطلاعات حساب کاربری شما
            </p>
          </div>

          <button
            onClick={() => navigate("/customer-dashboard")}
            className="
              ms-auto w-10 h-10 rounded-full border shadow-sm hover:shadow-md cursor-pointer
              bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
              dark:bg-purple-800 dark:hover:bg-purple-900 dark:border-indigo-500 dark:shadow-indigo-500 flex items-center justify-center transition
            "
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              نام و نام خانوادگی
            </label>
            <input
              value={fullname}
              onChange={handleNameChange}
              placeholder="مثال: علی احمدی"
              className="
                w-full p-3 border rounded-xl
                bg-white dark:bg-sky-900/60 text-gray-800 dark:text-white
                border-sky-300 dark:border-sky-700
                focus:ring-2 focus:ring-sky-500 dark:focus:ring-purple-500 focus:border-transparent
                placeholder:text-gray-400 dark:placeholder:text-gray-500
              "
            />
          </div>

          {/* Phone (read only) */}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              شماره تلفن
            </label>
            <input
              value={user?.phone || ""}
              disabled
              className="
                w-full p-3 border rounded-xl
                bg-gray-100 dark:bg-sky-800
                border-sky-200 dark:border-sky-700
                text-gray-500 cursor-not-allowed
              "
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
              {error}
            </p>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-300">
            تغییر شماره تلفن در حال حاضر امکان‌پذیر نیست
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving || !fullname.trim()}
            className="
              w-full bg-sky-600 hover:bg-sky-700 cursor-pointer
              dark:bg-purple-700 dark:hover:bg-purple-800
              text-white rounded-xl p-3 font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
