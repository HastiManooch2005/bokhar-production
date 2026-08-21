import { AlertTriangle } from "lucide-react";

export default function ReplaceAddressModal({
  isOpen,
  onClose,
  onConfirm,
  leastUsedAddress,
}) {
  if (!isOpen || !leastUsedAddress) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1f2e] p-6 shadow-2xl text-center">
        <AlertTriangle
          size={48}
          className="mx-auto text-amber-500 mb-4"
        />
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
          ظرفیت آدرس‌ها پر شده
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          شما ۱۰ آدرس ذخیره کرده‌اید. برای ثبت آدرس جدید، آدرس
          <span className="font-bold text-gray-800 dark:text-gray-200 mx-1">
            «{leastUsedAddress.title}»
          </span>
          (استفاده شده {leastUsedAddress.usage_count} بار) حذف می‌شود.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#262B40] text-gray-700 dark:text-gray-300 font-medium text-sm active:scale-95 transition"
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-medium text-sm active:scale-95 transition"
          >
            تایید و جایگزینی
          </button>
        </div>
      </div>
    </div>
  );
}