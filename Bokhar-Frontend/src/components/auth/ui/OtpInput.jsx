import { useRef } from "react";

export default function OtpInput({ value, onChange, length = 5 }) {
  const inputsRef = useRef([]);

  const digits = value.split("");
  const fullDigits = Array.from({ length }, (_, i) => digits[i] || "");

  const handleChange = (index, val) => {
    if (!/^\d?$/.test(val)) return;

    const newDigits = [...fullDigits];
    newDigits[index] = val;
    onChange(newDigits.join(""));

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (fullDigits[index] === "" && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  return (
    <div
      dir="ltr"
      className="flex justify-center items-center gap-1 max-w-xs mx-auto mb-4"
    >
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
          className="w-10 h-12 text-center border-b-2 outline-none bg-transparent text-xl font-semibold
           border-gray-400 focus:border-blue-500  text-gray-800 dark:text-gray-100
             dark:border-gray-100 dark:focus:border-purple-900 "
        />
      ))}
    </div>
  );
}
