import { useState, useEffect } from "react";
import api from "../api/clientApi";
import HorizontalScroller from "./HorizontalScroller";
import Skeleton from "./Skeleton"; 
export default function CategoryTabs({ 
  categories, 
  active, 
  onCategoryChange, 
  fullyDiscountedCategories = [],
  isLoading = false
}) {

  // اگه در حال لود هستیم، اسکلتون شایمر دار نشون بده
  if (isLoading) {
    const skeletonItems = Array.from({ length: 8 }, (_, i) => i);
    
    return (
      <div className="w-full">
        {/* اسکلتون موبایل */}
        <HorizontalScroller 
          className="px-2 py-2 scrollbar-hide lg:hidden" 
          innerClassName="gap-2"
        >
          {skeletonItems.map((i) => (
            <Skeleton
              key={i}
              className="relative flex-shrink-0 whitespace-nowrap px-4 py-2 my-2 mx-0.5 rounded-3xl text-sm font-bold transition-all "
            />
          ))}
        </HorizontalScroller>

        {/* اسکلتون دسکتاپ */}
        <HorizontalScroller 
          className="hidden lg:flex justify-center px-1 py-3 scrollbar-hide" 
          innerClassName="gap-3"
        >
          {skeletonItems.map((i) => (
            <Skeleton
              key={i}
              className="relative flex-shrink-0 whitespace-nowrap px-6 py-2 mx-1 rounded-3xl text-sm font-bold transition-all"
            />
          ))}
        </HorizontalScroller>
      </div>
    );
  }

  // کد قبلی کتگوری تب...
  const isCategoryFullyDiscounted = (catId) => {
    return fullyDiscountedCategories.includes(catId);
  };

  return (
    <div className="w-full">
      {/* موبایل */}
      <HorizontalScroller 
        className="px-2 py-2 scrollbar-hide lg:hidden" 
        innerClassName="gap-2"
      >
        {categories.map((cat) => {
          const isDiscounted = isCategoryFullyDiscounted(cat.id);
          const isActive = active?.id === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat)}
              className={`relative flex-shrink-0 whitespace-nowrap px-4 py-2 my-2 mx-0.5 rounded-3xl text-sm font-bold transition-all
                ${isActive 
                  ? "bg-sky-200 dark:bg-[#8AA1C4] dark:text-[3E3E7F9] scale-105 mx-1" 
                  : isDiscounted 
                    ? "bg-red-100 text-red-800 border border-red-400 animate-[pulse_2s_ease-in-out_infinite] shadow-sm hover:shadow-md" 
                    : "bg-white dark:bg-[#E3E7F9] dark:text-gray-700"
                }`}
            >
              {cat.name}
            </button>
          );
        })}
      </HorizontalScroller>

      {/* دسکتاپ */}
      <HorizontalScroller 
        className="hidden lg:flex justify-center px-1 py-3 scrollbar-hide" 
        innerClassName="gap-3"
      >
        {categories.map((cat) => {
          const isDiscounted = isCategoryFullyDiscounted(cat.id);
          const isActive = active?.id === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat)}
              className={`relative flex-shrink-0 whitespace-nowrap px-6 py-2 mx-1 rounded-3xl text-sm font-bold transition-all cursor-pointer
                ${isActive 
                  ? "bg-sky-200 dark:bg-[#8AA1C4] dark:text-[3E3E7F9] scale-105" 
                  : isDiscounted 
                    ? "bg-red-100 text-red-800 border border-red-400 animate-[pulse_2s_ease-in-out_infinite] shadow-sm hover:shadow-md" 
                    : "bg-white dark:bg-[#E3E7F9] dark:text-gray-700"
                }`}
            >
              {cat.name}
            </button>
          );
        })}
      </HorizontalScroller>
    </div>
  );
}
