import React from "react";

export default function StepProgress({ steps, step, maxStep, onStepClick }) {
  return (
    <div className="flex items-center justify-between relative  md:mt-20">
      {/* خط پیشرفت زمینه */}


      {steps.map((item) => {
        const isClickable = item.id <= maxStep;
        const isActive = step === item.id;
        const isCompleted = maxStep >= item.id;

        return (
          <div
            key={item.id}
            className={`flex flex-col items-center w-full transition-all relative z-15
              ${
                isClickable
                  ? "cursor-pointer hover:opacity-90"
                  : "cursor-not-allowed opacity-60"
              }`}
            onClick={() => isClickable && onStepClick(item.id)}
          >
            {/* دایره مرحله */}
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-300 font-bold
                ${
                  isActive
                    ? `
                      from-sky-300 to-sky-300 border-sky-300 text-sky-600 shadow-md
                      dark:bg-gradient-to-r dark:from-[#8AA1C4] dark:to-[#8AA1C4]
                      dark:border-[#8AA1C4] dark:text-white/90
                      dark:shadow-[#8AA1C4]/30
                    `
                    : isCompleted
                    ? `
                      bg-sky-100 border-sky-200 text-sky-700
                      dark:bg-[#262B40]/60 dark:border-gray-600 dark:text-gray-200
                    `
                    : `
                      bg-white border-sky-100 text-gray-400
                      dark:bg-[#1a1f2e]/60 dark:border-gray-700 dark:text-gray-500
                    `
                }`}
            >
              {isCompleted && !isActive ? "✓" : item.id}
            </div>

            {/* برچسب مرحله */}
            <span
              className={`mt-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "text-sky-600 dark:text-[#8AA1C4]"
                    : isCompleted
                    ? "text-sky-500 dark:text-gray-200"
                    : "text-gray-400 dark:text-gray-500"
                }`}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}