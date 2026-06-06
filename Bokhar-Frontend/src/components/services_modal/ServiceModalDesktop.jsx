import { X } from "lucide-react";
import DesktopModal from "../BaseModal/DesktopModal";

export default function ServiceModalDesktop({
  isOpen,
  onClose,
  itemTitle,
  availableTabs,
  activeTab,
  setActiveTab,
  currentMaterials,
  quantities,
  changeQuantity,
  totalPrice,
  handleAdd,
}) {
  if (!availableTabs.length) return null;

  return (
    <DesktopModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {itemTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X size={24} />
          </button>
        </div>
      }
    >
      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm transition ${
              activeTab === tab
                ? "bg-white dark:bg-sky-800 shadow font-semibold border border-sky-300 dark:border-sky-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* MATERIAL LIST */}
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pb-4">
        {Object.entries(currentMaterials).map(([mat, price]) => {
          const qty = quantities[mat] || 0;
          const selected = qty > 0;

          return (
            <div
              key={mat}
              className={`flex justify-between items-center p-4 rounded-xl border transition ${
                selected
                  ? "border-sky-600 bg-sky-50 dark:bg-sky-900/40"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            >
              <div className="text-right">
                <div className="font-bold text-gray-800 dark:text-gray-100">
                  {mat}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {Number(price).toLocaleString()} تومان
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQuantity(mat, -1)}
                  disabled={qty === 0}
                  className={`w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center
                    ${
                      qty === 0
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                    }
                  `}
                >
                  –
                </button>

                <span
                  className={`w-6 text-center font-bold ${
                    selected
                      ? "text-sky-600 dark:text-sky-300"
                      : "text-gray-800 dark:text-gray-100"
                  }`}
                >
                  {qty}
                </span>

                <button
                  onClick={() => changeQuantity(mat, 1)}
                  className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 text-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
        <div className="font-bold text-gray-800 dark:text-gray-100">
          مجموع کل:
          <span className="text-sky-600 dark:text-sky-300 mx-1">
            {totalPrice.toLocaleString()} تومان
          </span>
        </div>

        <button
          onClick={handleAdd}
          disabled={totalPrice === 0}
          className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 
                   dark:bg-sky-700 dark:hover:bg-sky-600 text-white font-bold disabled:opacity-40"
        >
          افزودن به سبد
        </button>
      </div>
    </DesktopModal>
  );
}
