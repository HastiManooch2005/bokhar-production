import {
  Phone,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Support() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [openFAQ, setOpenFAQ] = useState(null);
  const faqRefs = useRef([]);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const sendMessage = () => {
    if (!message) return;
    alert("پیام شما ارسال شد ✅");
    setMessage("");
  };

  const faqs = [
    { question: "زمان تحویل سفارش چقدر است؟", answer: "معمولاً بین ۲ تا ۳ روز کاری" },
    { question: "اگر لباس آسیب ببیند چه می‌شود؟", answer: "پشتیبانی موضوع را بررسی و جبران می‌کند" },
    { question: "امکان لغو سفارش هست؟", answer: "قبل از شروع شستشو امکان لغو وجود دارد" },
  ];

  useEffect(() => {
    faqRefs.current.forEach((ref, idx) => {
      if (ref) {
        ref.style.maxHeight = openFAQ === idx ? `${ref.scrollHeight}px` : "0px";
        ref.style.opacity = openFAQ === idx ? "1" : "0";
      }
    });
  }, [openFAQ]);

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div className="md:max-w-3xl md:mx-auto space-y-6 md:mt-15 mb-20 md:mb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">پشتیبانی</h1>

          {/* Back Button */}
          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full shadow-sm hover:shadow-md cursor-pointer
              bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
               dark:bg-purple-800 dark:hover:bg-purple-900 dark:border-indigo-500 dark:shadow-indigo-500 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* تماس */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 border border-sky-200 dark:border-sky-700 rounded-2xl shadow p-4 flex items-center justify-between transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-green-600 flex items-center justify-center">
              <Phone className="text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">تماس با پشتیبانی</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">همه روزه ۹ تا ۱۸</p>
            </div>
          </div>
          <a
            href="tel:02112345678"
            className="text-green-600 dark:text-green-200 font-medium"
          >
            تماس
          </a>
        </div>

        {/* ارسال پیام */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 border border-sky-200 dark:border-sky-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="text-blue-600 dark:text-blue-400" />
            <p className="font-medium text-gray-900 dark:text-gray-100">ارسال پیام</p>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام خود را اینجا بنویسید..."
            className="
              w-full border rounded-xl p-3 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500
              bg-white dark:bg-sky-900/60 border-sky-300 dark:border-sky-700 text-gray-900 dark:text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-300
            "
          />
          <button
            onClick={sendMessage}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-xl p-3 mt-3 transition font-medium"
          >
            ارسال پیام
          </button>
        </div>

        {/* سوالات متداول */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950 border border-sky-200 dark:border-sky-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="text-orange-600 dark:text-orange-400" />
            <p className="font-medium text-gray-900 dark:text-gray-100">سوالات متداول</p>
          </div>

          <div className="space-y-2 text-gray-900 dark:text-gray-100">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b last:border-none border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  className="w-full flex justify-between items-center py-2 text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
                >
                  {faq.question}
                  <ChevronDown
                    size={18}
                    className={`transition-transform duration-300 ${
                      openFAQ === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  ref={(el) => (faqRefs.current[idx] = el)}
                  className="overflow-hidden transition-all duration-300 ease-in-out py-3 opacity-0 max-h-0"
                >
                  <p className="text-gray-500 dark:text-gray-300 text-sm mt-1">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
