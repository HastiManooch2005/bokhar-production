import {
  Phone,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Support() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
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

  const [tickets, setTickets] = useState([]);

  const fetchTickets = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/tickets/`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !subject.trim()) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/tickets/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: subject,
            body: message,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "خطا در ارسال تیکت");
      }

      alert("پیام شما با موفقیت ارسال شد ✅");

      setMessage("");
      setSubject("");
      await fetchTickets();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "answered":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-amber-500" />;
      case "closed":
        return <XCircle size={16} className="text-gray-400" />;
      default:
        return <Clock size={16} className="text-amber-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "answered":
        return "پاسخ داده شده";
      case "pending":
        return "در انتظار پاسخ";
      case "closed":
        return "بسته شده";
      default:
        return "در انتظار پاسخ";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "answered":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
      case "closed":
        return "bg-gray-50 text-gray-600 border-gray-200 dark:bg-[#262B40] dark:text-gray-400 dark:border-gray-700";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div className="md:max-w-3xl md:mx-auto space-y-6 md:mt-15 mb-20 md:mb-0">

        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-200">پشتیبانی</h1>

          {/* Back Button */}
          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full shadow-sm hover:shadow-md cursor-pointer
              bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
               dark:bg-[#262B40] dark:hover:bg-[#2d3350] dark:border-gray-600
               dark:shadow-black/40 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* تماس */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 flex items-center justify-between transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-[#262B40] flex items-center justify-center">
              <Phone className="text-green-600 dark:text-[#8AA1C4]" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-200">تماس با پشتیبانی</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">همه روزه ۹ تا ۱۸</p>
            </div>
          </div>
          <a
            href="tel:02112345678"
            className="text-green-600 dark:text-[#8AA1C4] font-medium"
          >
            تماس
          </a>
        </div>

        {/* ارسال پیام */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="text-blue-600 dark:text-[#8AA1C4]" />
            <p className="font-medium text-gray-900 dark:text-gray-200">ارسال پیام</p>
          </div>

          {/* Subject Input */}
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="عنوان تیکت..."
            className="
              w-full border rounded-xl p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[#8AA1C4]
              bg-white dark:bg-[#1a1f2e] border-sky-300 dark:border-gray-600 text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            "
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام خود را اینجا بنویسید..."
            className="
              w-full border rounded-xl p-3 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-[#8AA1C4]
              bg-white dark:bg-[#1a1f2e] border-sky-300 dark:border-gray-600 text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            "
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim() || !subject.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8] dark:disabled:bg-[#262B40] text-white rounded-xl p-3 mt-3 transition font-medium"
          >
            ارسال پیام
          </button>
        </div>

        {/* لیست تیکت‌ها */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-purple-600 dark:text-[#8AA1C4]" />
            <p className="font-medium text-gray-900 dark:text-gray-200">تیکت‌های من</p>
            <span className="mr-auto text-sm text-gray-500 dark:text-gray-400">
              {tickets.length} تیکت
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-50" />
              <p>هنوز تیکتی ارسال نکرده‌اید</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/customer-dashboard/support/${ticket.id}`)}
                  className="bg-white dark:bg-[#262B40]/40 border border-sky-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {ticket.body}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${getStatusColor(ticket.status)}`}
                    >
                      {getStatusIcon(ticket.status)}
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(ticket.created_at).toLocaleDateString("fa-IR")}
                    </span>
                    {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        آخرین بروزرسانی: {new Date(ticket.updated_at).toLocaleDateString("fa-IR")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* سوالات متداول */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="text-orange-600 dark:text-[#8AA1C4]" />
            <p className="font-medium text-gray-900 dark:text-gray-200">سوالات متداول</p>
          </div>

          <div className="space-y-2 text-gray-900 dark:text-gray-200">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b last:border-none border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  className="w-full flex justify-between items-center py-2 text-sm font-medium text-gray-900 dark:text-gray-200 focus:outline-none"
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
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}