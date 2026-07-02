import { useState, useEffect } from "react";
import ServiceModal from "./services_modal/ServiceModal";
import api from "../api/clientApi";
import DiscountBadgeClient, { getDiscountStatus } from "./DiscountBadgeClient";
import Skeleton from "./Skeleton"; 

export default function Card({
  id,
  image,
  title,
  base_price,
  category,
  onDiscountCheck,
  preloadedPricing
}) {
  const [open, setOpen] = useState(false);
  const [pricing, setPricing] = useState(preloadedPricing || null);
  const [loading, setLoading] = useState(!preloadedPricing);

  useEffect(() => {
    if (preloadedPricing) {
      setPricing(preloadedPricing);
      setLoading(false);

      if (onDiscountCheck) {
        const hasDiscount =
          getDiscountStatus({
            id,
            title,
            image,
            base_price,
            pricing: preloadedPricing,
            category
          }) !== null;

        onDiscountCheck(id, hasDiscount);
      }
      return;
    }

    const fetchPricing = async () => {
      try {
        const res = await api.getProduct(id);
        setPricing(res.pricing);

        if (onDiscountCheck) {
          const hasDiscount =
            getDiscountStatus({
              id,
              title,
              image,
              base_price,
              pricing: res.pricing,
              category
            }) !== null;
          onDiscountCheck(id, hasDiscount);
        }
      } catch (err) {
        console.log("Error loading pricing", err);
        if (onDiscountCheck) onDiscountCheck(id, false);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [id, preloadedPricing, category]);

  const openModal = () => setOpen(true);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="relative p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-[#8AA1C4]
         border border-sky-200 dark:border-indigo-600 shadow-xl 
        flex flex-col justify-between min-h-[220px] sm:min-h-[280px]"
      >
        <Skeleton className="w-full aspect-[3/4] sm:aspect-square rounded-xl" />

        <Skeleton className="h-4 w-2/3 mt-2 sm:mt-3 rounded" />
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="relative p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-[#262B40]
       border border-sky-200 dark:border-gray-500 shadow-xl 
      flex flex-col justify-between min-h-[220px] sm:min-h-[280px] hover:scale-[1.02] 
      sm:hover:scale-[1.03] transition-all duration-300 group"
    >
      <DiscountBadgeClient product={{ id, title, image, base_price, pricing, category }} />

      <div className="w-full aspect-[3/3] md:aspect-[2/1.8] sm:aspect-square mb-2 sm:mb-3 overflow-hidden rounded-xl border border-sky-200 dark:border-gray-500 shadow">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-3">
        <h3 className="font-bold text-center truncate text-slate-800 dark:text-gray-100 px-1 sm:px-2 text-sm sm:text-base">
          {title}
        </h3>

        <button
          onClick={openModal}
          className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-100 to-sky-200 
          dark:from-[#8AA1C4] dark:to-[#8AA1C4] border border-sky-200 dark:border-[#262B40] 
          shadow-lg text-gray-800 dark:text-white font-semibold hover:from-sky-200 hover:to-sky-300 dark:hover:from-[#7392c2] dark:hover:to-[#7392c2]
          transition-all active:scale-95 text-sm sm:text-base"
        >
          خدمات
        </button>
      </div>

      <ServiceModal
        isOpen={open}
        onClose={() => setOpen(false)}
        productId={id}
        pricing={pricing || {}}
        itemTitle={title}
      />
    </div>
  );
}
