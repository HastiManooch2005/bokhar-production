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
                      dark:bg-gradient-to-r dark:from-purple-700 dark:to-purple-800
                      dark:border-indigo-600 dark:text-white/90
                      dark:shadow-indigo-300
                    `
                    : isCompleted
                    ? `
                      bg-sky-100 border-sky-200 text-sky-700
                      dark:bg-sky-800/60 dark:border-sky-700 dark:text-sky-100
                    `
                    : `
                      bg-white border-sky-100 text-gray-400
                      dark:bg-sky-900/60 dark:border-sky-800 dark:text-gray-500
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
                    ? "text-sky-600 dark:text-sky-100"
                    : isCompleted
                    ? "text-sky-500 dark:text-sky-100"
                    : "text-gray-400 dark:text-gray-100"
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
