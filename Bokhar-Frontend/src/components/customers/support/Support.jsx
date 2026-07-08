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
  Shirt,
  Wrench,
  Tag,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getUserTickets, createTicket, closeTicket } from "../../../api/ticketApi";

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
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactMode, setContactMode] = useState("support");

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const data = await getUserTickets();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      if (error.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoadingTickets(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCloseTicket = async (ticketId, e) => {
    e.stopPropagation();
    try {
      await closeTicket(ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: "closed" } : t))
      );
    } catch (error) {
      console.error("Error closing ticket:", error);
      alert("خطا در بستن تیکت");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !subject.trim()) return;
    setSending(true);
    try {
      await createTicket({
        subject: subject,
        body: message,
      });
      alert("پیام شما با موفقیت ارسال شد ✅");
      setMessage("");
      setSubject("");
      setSelectedCategory("");
      await fetchTickets();
    } catch (error) {
      console.error("Error sending ticket:", error);
      alert(error.detail || "خطا در ارسال تیکت");
    } finally {
      setSending(false);
    }
  };

  const supportFaqs = [
    { question: "چطور رمز عبورم را تغییر دهم؟", answer: "از منوی پروفایل > تنظیمات > تغییر رمز عبور اقدام کنید" },
    { question: "پرداخت ناموفق شد، پولم کجاست؟", answer: "مبلغ تا ۷۲ ساعت به حساب شما برمی‌گردد" },
    { question: "چطور حساب کاربری‌ام را حذف کنم؟", answer: "با پشتیبانی تماس بگیرید یا تیکت ارسال کنید" },
  ];

  const drycleaningFaqs = [
    { question: "زمان تحویل سفارش چقدر است؟", answer: "معمولاً بین ۲ تا ۳ روز کاری" },
    { question: "اگر لباس آسیب ببیند چه می‌شود؟", answer: "خشکشویی موضوع را بررسی و جبران می‌کند" },
    { question: "امکان لغو سفارش هست؟", answer: "قبل از شروع شستشو امکان لغو وجود دارد" },
    { question: "مواد شوینده شما ضد حساسیت است؟", answer: "بله، ما از مواد شوینده استاندارد و ضد حساسیت استفاده می‌کنیم" },
  ];

  const faqs = contactMode === "support" ? supportFaqs : drycleaningFaqs;

  const drycleaningCategories = [
    "تأخیر در تحویل",
    "کیفیت شستشو",
    "آسیب دیدگی لباس",
    "قیمت و فاکتور",
    "لغو سفارش",
    "سایر",
  ];

  const [selectedCategory, setSelectedCategory] = useState("");

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
      case "open":
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
      case "answered": return "پاسخ داده شده";
      case "open": return "در انتظار پاسخ";
      case "pending": return "در انتظار پاسخ";
      case "closed": return "بسته شده";
      default: return "در انتظار پاسخ";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "answered":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "open":
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

        {/* Toggle Switch */}
        <div className="bg-white dark:bg-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-1.5 flex gap-1">
          <button
            onClick={() => setContactMode("support")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              contactMode === "support"
                ? "bg-sky-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d3350]"
            }`}
          >
            <Wrench size={16} />
            ارتباط با پشتیبانی
          </button>
          <button
            onClick={() => setContactMode("drycleaning")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              contactMode === "drycleaning"
                ? "bg-sky-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d3350]"
            }`}
          >
            <Shirt size={16} />
            ارتباط با خشکشویی
          </button>
        </div>

        {/* تماس */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 flex items-center justify-between transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-[#262B40] flex items-center justify-center">
              <Phone className="text-green-600 dark:text-[#8AA1C4]" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-200">
                {contactMode === "support" ? "تماس با پشتیبانی" : "تماس با خشکشویی"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contactMode === "support" ? "همه روزه ۹ تا ۱۸" : "همه روزه ۸ تا ۲۲"}
              </p>
            </div>
          </div>
          <a
            href={contactMode === "support" ? "tel:02112345678" : "tel:02187654321"}
            className="text-green-600 dark:text-[#8AA1C4] font-medium"
          >
            {contactMode === "support" ? "۰۲۱۱۲۳۴۵۶۷۸" : "۰۲۱۸۷۶۵۴۳۲۱"}
          </a>
        </div>

        {/* ارسال پیام */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="text-blue-600 dark:text-[#8AA1C4]" />
            <p className="font-medium text-gray-900 dark:text-gray-200">
              {contactMode === "support" ? "ارسال پیام به پشتیبانی" : "ارسال پیام به خشکشویی"}
            </p>
          </div>

          {contactMode === "drycleaning" && (
            <div className="mb-3">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">دسته‌بندی موضوع</label>
              <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex gap-2 whitespace-nowrap">
                  {drycleaningCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSubject(cat);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 ${
                        selectedCategory === cat
                          ? "bg-sky-500 text-white border-sky-500"
                          : "bg-white dark:bg-[#1a1f2e] border-sky-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-[#2d3350]"
                      }`}
                    >
                      <Tag size={12} className="inline ml-1" />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={contactMode === "support" ? "عنوان تیکت..." : "موضوع یا دسته‌بندی..."}
            className="w-full border rounded-xl p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[#8AA1C4]
              bg-white dark:bg-[#1a1f2e] border-sky-300 dark:border-gray-600 text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              contactMode === "support"
                ? "مشکل یا سوال خود را اینجا بنویسید..."
                : "جزئیات سفارش یا مشکل لباس خود را بنویسید..."
            }
            className="w-full border rounded-xl p-3 resize-none h-28 focus:outline-none focus:ring-2 focus:ring-[#8AA1C4]
              bg-white dark:bg-[#1a1f2e] border-sky-300 dark:border-gray-600 text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || !subject.trim() || sending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
              dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8] dark:disabled:bg-[#262B40]
              text-white rounded-xl p-3 mt-3 transition font-medium flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                در حال ارسال...
              </>
            ) : (
              <>
                <MessageCircle size={18} />
                {contactMode === "support" ? "ارسال به پشتیبانی" : "ارسال به خشکشویی"}
              </>
            )}
          </button>
        </div>

        {/* لیست تیکت‌ها */}
        <div className="bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] border border-sky-200 dark:border-gray-700 rounded-2xl shadow p-4 transition">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-purple-600 dark:text-[#8AA1C4]" />
            <p className="font-medium text-gray-900 dark:text-gray-200">
              {contactMode === "support" ? "تیکت‌های پشتیبانی" : "تیکت‌های خشکشویی"}
            </p>
            <span className="mr-auto text-sm text-gray-500 dark:text-gray-400">
              {tickets.length} تیکت
            </span>
          </div>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 size={32} className="animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-50" />
              <p>
                {contactMode === "support"
                  ? "هنوز تیکتی به پشتیبانی ارسال نکرده‌اید"
                  : "هنوز تیکتی به خشکشویی ارسال نکرده‌اید"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/customer-dashboard/support/${ticket.id}`)}
                  className="bg-white dark:bg-[#262B40]/40 border border-sky-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-200 truncate flex-1">
                      {ticket.subject}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {getStatusText(ticket.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleDateString("fa-IR")
                          : ""}
                      </span>
                      {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} />
                          {new Date(ticket.updated_at).toLocaleDateString("fa-IR")}
                        </span>
                      )}
                    </div>
                    {ticket.status !== "closed" && (
                      <button
                        onClick={(e) => handleCloseTicket(ticket.id, e)}
                        className="text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition font-medium"
                      >
                        بستن تیکت
                      </button>
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
            <p className="font-medium text-gray-900 dark:text-gray-200">
              {contactMode === "support" ? "سوالات متداول پشتیبانی" : "سوالات متداول خشکشویی"}
            </p>
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
                    className={`transition-transform duration-300 ${openFAQ === idx ? "rotate-180" : ""}`}
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