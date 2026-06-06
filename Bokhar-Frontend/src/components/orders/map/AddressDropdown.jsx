import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddressDropdown({
  open,
  onClose,
  onSubmit,
  plaque,
  setPlaque,
  unit,
  setUnit,
  address,
  title,
  setTitle,
  fullScreen = false,
}) {
  const [description, setDescription] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* بک‌دراپ تمام صفحه */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }} // شفافیت بک‌دراپ
            exit={{ opacity: 0 }}
            style={{ backgroundColor: "black" }}
            onClick={onClose} // کلیک بیرون = بستن
          />

          {/* dropdown اصلی */}
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()} // کلیک داخل = بسته نشه
            className={`absolute inset-0 ${
              fullScreen
                ? "w-[75%] m-auto -top-1"
                : "bg-white dark:bg-gray-800 p-5 rounded-xl shadow-2xl shadow-sky-400 dark:shadow-black/40"
            }`}
          >
            <div
              dir="rtl"
              className={`${
                fullScreen
                  ? `
                    bg-gradient-to-br
                    from-sky-50 via-sky-100 to-sky-200
                    dark:from-sky-800 dark:via-sky-900 dark:to-sky-950
                    w-full h-[53%] flex flex-col
                    shadow-md shadow-sky-300 dark:shadow-black/40
                    border border-sky-200 dark:border-gray-600
                    rounded-2xl dark:rounded-xl p-4
                  `
                  : "w-[360px]"
              }`}
            >
              {/* header */}
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-sky-600 dark:text-sky-400">
                    اطلاعات تکمیلی
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {address}
                  </p>
                </div>
                <button onClick={onClose}>
                  <X
                    size={20}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  />
                </button>
              </div>

              {/* پلاک + واحد (یک ردیف) */}
              <div className="flex gap-3 mt-2 mx-auto w-[75%]">
                <input
                  type="number"
                  placeholder="پلاک"
                  value={plaque}
                  onChange={(e) => setPlaque(e.target.value)}
                  className="
                    w-1/2 border-2 rounded-lg px-2 py-1.5 text-sm
                    bg-sky-50 dark:bg-gray-700
                    shadow-md shadow-sky-200 dark:shadow-black/30
                    border-sky-300 dark:border-gray-600
                    text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-sky-400
                  "
                />
                <input
                  type="number"
                  placeholder="واحد"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="
                    w-1/2 border-2 rounded-lg px-2 py-1.5 text-sm
                    bg-sky-50 dark:bg-gray-700
                    shadow-md shadow-sky-200 dark:shadow-black/30
                    border-sky-300 dark:border-gray-600
                    text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-sky-400
                  "
                />
              </div>

              {/* input عنوان آدرس */}
              <div className="flex flex-col mt-3 mx-auto w-[75%]">
                <label className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                  عنوان آدرس
                </label>
                <input
                  placeholder="مثلاً خانه یا محل کار"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="
                    w-full border-2 rounded-lg px-2 py-1.5 text-sm
                    bg-sky-50 dark:bg-gray-700
                    shadow-md shadow-sky-200 dark:shadow-black/30
                    border-sky-300 dark:border-gray-600
                    text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-sky-400
                  "
                />
              </div>

              {/* textarea توضیحات */}
              <div className="flex flex-col mt-3 mx-auto w-[75%]">
                <label className="text-[11px] text-gray-600 dark:text-gray-400 mb-1">
                  توضیحات (اختیاری)
                </label>
                <textarea
                  placeholder="مثلاً زنگ خراب است..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="
                    w-full border-2 rounded-lg px-2 py-1 text-sm
                    bg-sky-50 dark:bg-gray-700
                    shadow-md shadow-sky-200 dark:shadow-black/20
                    border-sky-300 dark:border-gray-600
                    text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-sky-400
                    resize-none
                  "
                />
              </div>

              {/* submit */}
              <button
                onClick={() =>
                  onSubmit({
                    plaque,
                    unit,
                    title,
                    description,
                  })
                }
                className="
                  mt-4 mx-auto w-[75%]
                  bg-gradient-to-r from-sky-400 to-sky-500
                  hover:from-sky-500 hover:to-sky-600
                  dark:from-purple-700 dark:to-purple-800
                  dark:hover:from-purple-800 dark:hover:to-purple-900
                  border border-indigo-300 dark:border-indigo-600
                  shadow-md shadow-indigo-300 dark:shadow-black/30
                  text-gray-100 dark:text-white/90
                  rounded-xl py-2 font-bold text-sm
                  transition-all duration-300
                  hover:scale-102
                "
              >
                ثبت اطلاعات
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
