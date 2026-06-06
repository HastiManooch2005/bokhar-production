import { FiX } from "react-icons/fi";
import jalaali from "jalaali-js";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderModal({ order, isOpen, onClose }) {
  if (!order) return null;

  const formatJalaali = (date) => {
    const d = new Date(date);
    const { jm, jd } = jalaali.toJalaali(d);
    return `${jm}/${jd}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-br from-white via-gray-100 to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-md relative overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* دکمه بستن */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <FiX size={26} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              جزئیات سفارش #{order.id}
            </h2>

            <div className="space-y-3 text-gray-700 dark:text-gray-200">
              <p>
                <span className="font-semibold">نام مشتری:</span> {order.name}
              </p>
              <p>
                <span className="font-semibold">تلفن همراه:</span> {order.phone}
              </p>
              <p>
                <span className="font-semibold">آدرس:</span> {order.address}
              </p>
              <p>
                <span className="font-semibold">شهر:</span> {order.city}
              </p>
              <p>
                <span className="font-semibold">تاریخ ثبت:</span>{" "}
                {formatJalaali(order.date)}
              </p>
              <p>
                <span className="font-semibold">تاریخ تحویل:</span>{" "}
                {formatJalaali(order.deliveryDate)}
              </p>
              <p>
                <span className="font-semibold">مبلغ:</span>{" "}
                {order.price.toLocaleString()} تومان
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold">وضعیت:</span>
                <span
                  className={`px-3 py-1 rounded-full text-white text-sm font-medium transition-all duration-200 ${
                    order.status === "انجام شده"
                      ? "bg-gradient-to-r from-green-400 to-green-600"
                      : "bg-gradient-to-r from-red-400 to-red-600"
                  }`}
                >
                  {order.status}
                </span>
              </p>
            </div>

            {/* افکت hover روی مودال */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              whileHover={{ scale: 1.02 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
