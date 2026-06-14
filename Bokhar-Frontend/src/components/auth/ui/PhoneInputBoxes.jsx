import { useRef, useCallback } from "react";

export default function PhoneInputBoxes({ value, onChange }) {
  const inputsRef = useRef([]);
  const containerRef = useRef(null);

  // شماره باید همیشه با "09" شروع شود
  const normalized = value.startsWith("09") ? value.slice(2) : value;
  const digits = normalized.split("");

  // فقط 9 رقم بعد از 09
  const fullDigits = Array.from({ length: 9 }, (_, i) => digits[i] || "");

  const handleChange = (index, val) => {
    if (!/^\d?$/.test(val)) return;

    const newDigits = [...fullDigits];
    newDigits[index] = val;
    onChange("09" + newDigits.join(""));

    if (val && index < 8) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (fullDigits[index] === "" && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");

    // اگه با 09 شروع شده، 09 رو حذف کن
    let clean = pasted;
    if (clean.startsWith("09")) {
      clean = clean.slice(2);
    }

    // فقط 9 رقم اول
    clean = clean.slice(0, 9);

    if (clean.length > 0) {
      onChange("09" + clean);
      // فوکوس روی جعبه‌ی بعد از آخرین رقم وارد شده
      const focusIndex = Math.min(clean.length, 8);
      setTimeout(() => {
        inputsRef.current[focusIndex]?.focus();
      }, 0);
    }
  }, [onChange, fullDigits]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="flex justify-center items-center gap-0.5 max-w-xs mx-auto relative"
      onPaste={handlePaste}
    >
      {/* input مخفی برای paste روی کل ناحیه */}
      <input
        type="text"
        inputMode="numeric"
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        onPaste={handlePaste}
        onFocus={() => {
          // وقتی فوکوس شد، اولین جعبه‌ی خالی رو فوکوس کن
          const firstEmpty = fullDigits.findIndex(d => d === "");
          const index = firstEmpty === -1 ? 8 : firstEmpty;
          inputsRef.current[index]?.focus();
        }}
      />

      <div className="flex gap-1">
        <div
          className="w-6 h-10 border-b-2 border-gray-400 dark:border-gray-400
    flex items-center justify-center text-gray-600 dark:text-gray-400
    font-semibold select-none pointer-events-none cursor-not-allowed"
        >
          0
        </div>

        <div
          className="w-6 h-10 border-b-2 border-gray-400 dark:border-gray-400
    flex items-center justify-center text-gray-600 dark:text-gray-400
    font-semibold select-none pointer-events-none cursor-not-allowed"
        >
          9
        </div>
      </div>

      {/* 9 رقم ورودی */}
      {fullDigits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-6 h-10 text-center font-semibold border-b-2 outline-none bg-transparent
           border-gray-400 focus:border-blue-500 text-gray-800 
           dark:border-gray-100 dark:focus:border-purple-600 dark:text-gray-100"
        />
      ))}
    </div>
  );
}