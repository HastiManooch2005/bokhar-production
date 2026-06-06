import { useState } from "react";
import Sidebar from "../Sidebar";
import ServiceDiscountTab from "./tabs/ServiceDiscountTab";
import GlobalDiscountTab from "./tabs/GlobalDiscountTab";
import CouponTab from "./tabs/CouponTab";
import { FiTag } from "react-icons/fi";

export default function AdminDiscounts() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("discounts");
  const [activeTab, setActiveTab] = useState("coupon"); 

  return (
    <div dir="rtl" className="flex min-h-screen">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="flex-1 p-4 sm:p-6 md:pr-64 overflow-x-hidden ">
<h2 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold text-gray-800 dark:text-gray-100 mr-4 mb-8">
  <FiTag className="text-2xl" />
  مدیریت تخفیف‌ها
</h2>


        <div className="flex gap-3 mb-6 pt-2 overflow-x-auto pb-4 justify-center no-scrollbar">
          <button
            onClick={() => setActiveTab("coupon")}
            className={`px-3 py-1.5 text-sm sm:px-5 sm:py-2 sm:text-base rounded-full font-semibold border transition cursor-pointer
      ${
        activeTab === "coupon"
          ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border-gray-300 dark:border-indigo-600 shadow-md shadow-indigo-300 dark:shadow-indigo-500 scale-105 text-gray-800 dark:text-white/90"
          : "bg-white dark:bg-white/80 hover:bg-sky-100 dark:hover:bg-white/95 border-gray-200 shadow-lg text-gray-800"
      }`}
          >
            کدهای تخفیف
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`px-3 py-1.5 text-sm sm:px-5 sm:py-2 sm:text-base rounded-full font-semibold border transition cursor-pointer
      ${
        activeTab === "services"
          ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border-gray-300 dark:border-indigo-600 shadow-md shadow-indigo-300 dark:shadow-indigo-500 scale-105 text-gray-800 dark:text-white/90"
          : "bg-white dark:bg-white/80 hover:bg-sky-100 dark:hover:bg-white/95 border-gray-200 shadow-lg text-gray-800"
      }`}
          >
             سرویس‌ها
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`px-5 py-3 text-sm sm:text-base rounded-full font-semibold border transition cursor-pointer
      ${
        activeTab === "global"
          ? "bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border-gray-300 dark:border-indigo-600 shadow-md shadow-indigo-300 dark:shadow-indigo-500 scale-105 text-gray-800 dark:text-white/90"
          : "bg-white dark:bg-white/80 hover:bg-sky-100 dark:hover:bg-white/95 border-gray-200 shadow-lg text-gray-800"
      }`}
          >
             عمومی
          </button>
        </div>

        {activeTab === "coupon" && <CouponTab />}
        {activeTab === "services" && <ServiceDiscountTab />}
        {activeTab === "global" && <GlobalDiscountTab />}
      </main>
    </div>
  );
}
