import { Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PasswordSection from "./PasswordSection";

export default function SecurityPrivacy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div className="md:max-w-3xl md:mx-auto space-y-6 md:mt-16 mb-20 md:mb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Lock className="text-blue-600 dark:text-[#8AA1C4]" size={26} />
          <p className="font-semibold text-lg text-gray-900 dark:text-gray-200">
            امنیت و حریم خصوصی
          </p>

          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full border shadow-sm hover:shadow-md cursor-pointer
            bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
            dark:bg-[#262B40] dark:hover:bg-[#2d3350] dark:border-gray-600
            dark:shadow-black/40 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <PasswordSection />

      </div>
    </div>
  );
}