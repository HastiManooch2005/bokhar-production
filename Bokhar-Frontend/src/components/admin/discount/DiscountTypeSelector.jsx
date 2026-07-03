import { useState, useEffect } from "react";

export default function DiscountTypeSelector({ value, onChange }) {
  const [active, setActive] = useState(value?.type || null);
  const [amountValue, setAmountValue] = useState(
    value?.type === "amount" ? value.value : ""
  );
  const [percentValue, setPercentValue] = useState(
    value?.type === "percent" ? value.value : ""
  );

  useEffect(() => {
    if (!active) return;

    const val = active === "percent" ? percentValue : amountValue;

    onChange({
      type: active,
      value: val,
    });
  }, [active, amountValue, percentValue]);

  const reset = () => {
    setActive(null);
    setAmountValue("");
    setPercentValue("");
    onChange(null);
  };

  const wrapperClass = (type) => {
    if (active === null) return "flex-1";
    if (active === type) return "flex-1";
    return "w-0 opacity-0 pointer-events-none";
  };

  const activateType = (type) => {
    if (!active) setActive(type);
  };

  return (
    <div className="flex items-center gap-2 w-full h-12 select-none">
      {/* Percent */}
      <div
        onClick={() => activateType("percent")}
        className={`relative flex items-center overflow-hidden rounded-xl bg-gray-100 dark:bg-[#262B40] border border-transparent dark:border-gray-600 transition-all duration-500 ease-in-out cursor-pointer ${wrapperClass(
          "percent"
        )}`}
      >
        <input
          type="number"
          value={percentValue}
          onChange={(e) => setPercentValue(e.target.value)}
          placeholder="درصد"
          disabled={active !== "percent"}
          className="w-full h-full px-3 bg-transparent outline-none cursor-pointer dark:text-gray-200"
        />

        <span className="absolute left-3 text-sm text-gray-500 dark:text-gray-400">٪</span>
      </div>

      {/* Amount */}
      <div
        onClick={() => activateType("amount")}
        className={`relative flex items-center overflow-hidden rounded-xl bg-gray-100 dark:bg-[#262B40] border border-transparent dark:border-gray-600 transition-all duration-500 ease-in-out cursor-pointer ${wrapperClass(
          "amount"
        )}`}
      >
        <input
          type="number"
          value={amountValue}
          onChange={(e) => setAmountValue(e.target.value)}
          placeholder="مبلغ"
          disabled={active !== "amount"}
          className="w-full h-full px-3 bg-transparent outline-none cursor-pointer dark:text-gray-200"
        />

        <span className="absolute left-3 text-sm text-gray-500 dark:text-gray-400">تومان</span>
      </div>

      {/* Reset button (outside) */}
      {active && (
        <button
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition shrink-0"
        >
          ×
        </button>
      )}
    </div>
  );
}