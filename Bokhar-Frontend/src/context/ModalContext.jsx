import { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "تأیید",
    cancelText: "انصراف",
  });

  const showConfirm = ({
    title = "تأیید عملیات",
    message,
    onConfirm,
    confirmText = "بله، مطمئنم",
    cancelText = "منصرف شدم",
  }) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
    });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showConfirm }}>
      {children}

      <AnimatePresence>
        {modal.isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              dir="rtl"
              className="
                w-[90%] max-w-md rounded-3xl p-6 shadow-2xl border
                bg-white border-gray-200
                dark:bg-sky-900 dark:border-sky-700
              "
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">
                {modal.title}
              </h2>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {modal.message}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="
                    px-4 py-2 rounded-xl
                    bg-gray-200 hover:bg-gray-300
                    dark:bg-gray-700 dark:hover:bg-gray-600
                    text-gray-800 dark:text-white
                  "
                >
                  {modal.cancelText}
                </button>

                <button
                  onClick={handleConfirm}
                  className="
                    px-4 py-2 rounded-xl
                    bg-red-600 hover:bg-red-700
                    text-white
                  "
                >
                  {modal.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};
