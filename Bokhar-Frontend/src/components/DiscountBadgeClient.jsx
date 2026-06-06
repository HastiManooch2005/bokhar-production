import { useMemo } from "react";

// خروجی گرفتن تابع برای استفاده مجدد
export function getDiscountStatus(product) {
  if (!product?.pricing && !product?.category?.discount) return null;

  const now = new Date();

  // تخفیف دسته
  if (product?.category?.discount) {
    const d = product.category.discount;
    const start = d.start_at ? new Date(d.start_at) : null;
    const end = d.end_at ? new Date(d.end_at) : null;

    if (d.is_active !== false) {
      if (!start && !end) return "active";
      if (start && now < start) return "coming";
      if ((!start || now >= start) && (!end || now <= end)) return "active";
    }
  }

  // تخفیف روی مواد
  if (!product?.pricing) return null;

  const hasMaterialDiscount = Object.values(product.pricing).some(tab =>
    tab.materialPrices?.some(m => m.has_discount)
  );

  return hasMaterialDiscount ? "active" : null;
}

export default function DiscountBadgeClient({ product }) {
  const status = useMemo(() => getDiscountStatus(product), [product]);

  if (!status) return null;

  return (
    <div className="
      absolute -top-2 right-2 
      px-2 py-1 rounded-lg text-[11px] 
      bg-green-100 text-green-700 
      border border-green-300 font-semibold
    ">
      تخفیف فعال
    </div>
  );
}
