import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  Edit2,
} from "lucide-react";

export default function Payment({
  subtotal,
  originalSubtotal,  // قیمت اصلی قبل از تخفیف آیتم‌ها
  total,
  servicePrice,
  serviceType,
  serviceHours,
  discountAmount,
  discountCode,
  setDiscountCode,
  applyDiscount,
  handlePayment,
  goToTimeStep,
  goToLocationStep,
  datetime,
  location,
}) {
  const [loading, setLoading] = useState(false);
  const [discountStatus, setDiscountStatus] = useState(null);

  // محاسبه سود مشتری از تخفیف آیتم‌ها (تفاوت قیمت اصلی و نهایی سبد)
  const effectiveOriginalSubtotal = originalSubtotal || subtotal;
  const itemDiscountSavings = effectiveOriginalSubtotal - subtotal;
  
  // محاسبه کل سود (تخفیف آیتم‌ها + کد تخفیف)
  const totalSavings = itemDiscountSavings + (discountAmount || 0);
  const hasAnyDiscount = totalSavings > 0;
  
  // قیمت کل بدون هیچ تخفیفی (برای خط‌خوردن)
  const originalGrandTotal = effectiveOriginalSubtotal + (servicePrice || 0);

  const onApplyDiscount = async () => {
    const ok = await applyDiscount();
    setDiscountStatus(ok ? "success" : "error");
    setTimeout(() => setDiscountStatus(null), 2500);
  };

  const onPay = async () => {
    setLoading(true);
    await handlePayment();
    setLoading(false);
  };

  // تابع کمکی برای نام سرویس
  const getServiceLabel = () => {
    if (serviceType === 'express') return 'سرویس فوری (تا ۲۴ ساعت)';
    if (serviceType === 'standard') return 'سرویس استاندارد (تا ۴۸ ساعت)';
    if (serviceType === 'economy') return 'سرویس اقتصادی (۷۲+ ساعت)';
    return 'هزینه سرویس';
  };

  // تعیین رنگ بر اساس نوع سرویس
  const getServiceColor = () => {
    if (serviceType === 'express') return 'text-red-600 dark:text-red-400';
    if (serviceType === 'standard') return 'text-amber-600 dark:text-amber-400';
    if (serviceType === 'economy') return 'text-emerald-600 dark:text-emerald-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <motion.div
      dir="rtl"
      className="w-full max-w-xl mx-auto mb-12 md:mb-0 pb-4 px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className="
          rounded-3xl p-6 space-y-7 border shadow-xl
          bg-sky-50
          dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          border-sky-200 dark:border-gray-700
          shadow-sky-200/40 dark:shadow-black/40
        "
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="
              size-11 rounded-2xl flex items-center justify-center
              bg-sky-100
              dark:bg-[#262B40]/60
            "
          >
            <CreditCard className="text-sky-600 dark:text-[#8AA1C4]" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            پرداخت نهایی
          </h2>
        </div>

        {/* Summary */}
        <div className="space-y-3 text-sm">
          {/* جمع خرید - با نمایش خط‌خورده اگر تخفیف آیتم داریم */}
          {itemDiscountSavings > 0 ? (
            <div className="flex justify-between items-start">
              <span className="text-gray-600 dark:text-gray-300 pt-1">جمع خرید</span>
              <div className="flex flex-col items-end">
                <span className="text-xs line-through text-gray-400 dark:text-gray-500">
                  {effectiveOriginalSubtotal.toLocaleString()} تومان
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {subtotal.toLocaleString()} تومان
                </span>
              </div>
            </div>
          ) : (
            <Row label="جمع خرید" value={`${subtotal.toLocaleString()} تومان`} />
          )}

          {/* هزینه پیک */}
          <Row
            label="هزینه پیک"
            value="رایگان"
            valueClass="text-gray-500 dark:text-gray-300"
          />

          {/* ردیف جدید: هزینه سرویس زمانی */}
          {servicePrice !== undefined && (
            <Row
              label={getServiceLabel()}
              value={servicePrice === 0 ? "رایگان" : `${servicePrice.toLocaleString()} تومان`}
              valueClass={getServiceColor()}
            />
          )}

          {discountAmount > 0 && (
            <Row
              label="تخفیف (کد)"
              value={`-${discountAmount.toLocaleString()} تومان`}
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
          )}

          <div className="h-px bg-sky-200 dark:bg-gray-700 my-2" />

          {/* بخش مبلغ نهایی - مشابه فاکتور */}
          <div className="flex justify-between items-start pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-gray-700 dark:text-gray-200 font-bold text-lg">
                مبلغ نهایی
              </span>
              {hasAnyDiscount && (
                <span className="text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  سود شما از این خرید: {totalSavings.toLocaleString()} تومان
                </span>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1">
              {hasAnyDiscount && (
                <span className="text-base md:text-lg line-through text-gray-400 dark:text-gray-500">
                  {originalGrandTotal.toLocaleString()} تومان
                </span>
              )}
              <span className="text-2xl font-bold text-sky-700 dark:text-gray-200">
                {total.toLocaleString()} 
                <span className="text-sm font-normal text-sky-600 dark:text-gray-400 mr-1">تومان</span>
              </span>
            </div>
          </div>
        </div>

        {/* Delivery & Location Info */}
        <div className="space-y-3 text-sm rounded-2xl p-4 bg-white/60 dark:bg-[#262B40]/40 border border-sky-200 dark:border-gray-700">
          {/* زمان تحویل دادن */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              زمان تحویل دادن:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">
                {datetime?.delivery?.date} — {datetime?.delivery?.time}
              </span>
            </div>
          </div>

          {/* زمان تحویل گرفتن */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              زمان تحویل گرفتن:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">
                {datetime?.pickup?.date} — {datetime?.pickup?.time}
              </span>
              {/* نمایش تعداد ساعت */}
            </div>
          </div>

          {/* آدرس */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                آدرس:
              </span>
              <span className="text-gray-600 dark:text-gray-300 leading-relaxed pr-2">
                {location?.address} پلاک {location?.plaque}، واحد{" "}
                {location?.unit}
              </span>
            </div>
            <Edit2
              className="size-4 cursor-pointer text-sky-600 dark:text-[#8AA1C4] mt-1 mr-2 flex-shrink-0"
              onClick={() => goToLocationStep()}
            />
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1 ">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-gray-300" />
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="کد تخفیف خود را وارد کنید"
                className="
                  w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none
                  bg-white border-sky-300
                  dark:bg-[#262B40]/60 dark:border-gray-600 dark:text-gray-200
                  focus:ring-2 focus:ring-[#8AA1C4]
                 placeholder:text-gray-400  dark:placeholder:text-gray-500
                "
              />
            </div>

            <button
              onClick={onApplyDiscount}
              className="
                px-4 rounded-xl font-semibold transition
                bg-sky-100 hover:bg-sky-200 text-gray-800
                dark:bg-[#262B40]/60 dark:hover:bg-[#2d3350] dark:text-gray-200
              "
            >
              اعمال
            </button>
          </div>

          <AnimatePresence>
            {discountStatus && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`flex items-center gap-1 text-sm ${
                  discountStatus === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {discountStatus === "success" ? (
                  <>
                    <CheckCircle className="size-4" />
                    کد تخفیف اعمال شد
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" />
                    کد تخفیف نامعتبر است
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pay */}
        <button
          onClick={onPay}
          disabled={loading}
          className="
            w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2 transition
            bg-sky-600 hover:bg-sky-700 text-white
            dark:bg-[#8AA1C4]
            dark:hover:bg-[#7a93b8]
            disabled:opacity-70
          "
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            `پرداخت ${total.toLocaleString()} تومان`
          )}
        </button>
      </div>
    </motion.div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex justify-between text-gray-700 dark:text-gray-300">
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}