import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FiSend,
  FiChevronLeft,
  FiUser,
  FiShield,
  FiMessageSquare,
  FiClock,
  FiImage,
  FiPaperclip,
  FiMapPin,
  FiX,
  FiDownload,
  FiExternalLink,
} from "react-icons/fi";

// ─── دیتای فیک برای تست UI ───
const FAKE_TICKET = {
  id: 42,
  subject: "مشکل در پرداخت آنلاین - کارت بانکی",
  status: "pending",
  created_at: "2026-07-05T08:30:00Z",
  messages: [
    {
      id: 1,
      text: "سلام! به پشتیبانی خوش آمدید. 🎉\n\nلطفاً مشکل خود را به صورت کامل توضیح دهید تا بتوانم بهترین راهنمایی را ارائه دهم.",
      isCustomer: false,
      time: "۰۹:۳۰",
      type: "text",
    },
    {
      id: 2,
      text: "سلام، من وقتی می‌خوام پرداخت کنم خطای «تراکنش ناموفق» می‌گیره. چند بار هم امتحان کردم ولی فرقی نکرد.",
      isCustomer: true,
      time: "۰۹:۳۵",
      type: "text",
    },
    {
      id: 3,
      text: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
      isCustomer: true,
      time: "۰۹:۳۶",
      type: "image",
      fileName: "screenshot-error.jpg",
      fileSize: "۲۴۵.۳ KB",
    },
    {
      id: 4,
      text: "ممنون از ارسال اسکرین‌شات! 👍\n\nبررسی کردم، مشکل از سمت درگاه بانکی بوده و الان رفع شده. لطفاً دوباره تلاش کنید. اگر باز هم مشکل داشتید، لطفاً شماره کارت و بانک خود را اعلام کنید.",
      isCustomer: false,
      time: "۰۹:۴۵",
      type: "text",
    },
    {
      id: 5,
      text: "blob:fake-receipt-url",
      isCustomer: true,
      time: "۱۰:۰۲",
      type: "file",
      fileName: "receipt.pdf",
      fileSize: "۱۸.۲ KB",
    },
    {
      id: 6,
      text: "https://www.google.com/maps?q=35.6892,51.3890",
      isCustomer: true,
      time: "۱۰:۱۵",
      type: "location",
      lat: 35.6892,
      lng: 51.3890,
    },
    {
      id: 7,
      text: "ممنون! اطلاعات کامل شد. ✅\n\nظرف ۲۴ ساعت آینده نتیجه را پیامک می‌کنیم. اگر سوال دیگری دارید همینجا بپرسید.",
      isCustomer: false,
      time: "۱۰:۲۰",
      type: "text",
    },
  ],
};

export default function CustomerTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  const [ticket, setTicket] = useState(null);

  // دریافت جزئیات تیکت از API (یا دیتای فیک)
  const fetchTicket = async () => {
    try {
      // برای تست UI بدون API، از دیتای فیک استفاده کن:
      await new Promise((resolve) => setTimeout(resolve, 800)); // شبیه‌سازی لودینگ
      setTicket(FAKE_TICKET);

      // وقتی API آماده شد، این کد رو فعال کن:
      // const response = await fetch(
      //   `${import.meta.env.VITE_API_URL}/tickets/${id}/`,
      //   { credentials: "include" }
      // );
      // if (!response.ok) throw new Error("خطا در دریافت تیکت");
      // const data = await response.json();
      // setTicket(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (ticket?.messages?.length) scrollToBottom();
  }, [ticket?.messages]);

  const handleSend = async () => {
    if (!replyText.trim()) return;

    const newMsg = {
      id: (ticket.messages?.length || 0) + 1,
      text: replyText.trim(),
      isCustomer: true,
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
    };

    // TODO: ارسال پیام به API
    // await fetch(`${import.meta.env.VITE_API_URL}/tickets/${id}/messages/`, {...})

    setTicket((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), newMsg],
      status: "pending",
    }));

    setReplyText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const newMsg = {
      id: (ticket.messages?.length || 0) + 1,
      text: fileUrl,
      isCustomer: true,
      time: new Date().toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + " KB",
    };

    // TODO: آپلود فایل و ارسال به API

    setTicket((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), newMsg],
      status: "pending",
    }));

    setShowAttachmentMenu(false);
    e.target.value = "";
  };

  const handleLocationSend = () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const newMsg = {
          id: (ticket.messages?.length || 0) + 1,
          text: mapsUrl,
          isCustomer: true,
          time: new Date().toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "location",
          lat: latitude,
          lng: longitude,
        };

        // TODO: ارسال لوکیشن به API

        setTicket((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), newMsg],
          status: "pending",
        }));
        setShowAttachmentMenu(false);
      },
      () => {
        alert("دسترسی به موقعیت مکانی رد شد");
      }
    );
  };

  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case "image":
        return (
          <div className="space-y-2">
            <div className="relative group">
              <img
                src={msg.text}
                alt={msg.fileName}
                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                onClick={() => window.open(msg.text, "_blank")}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <FiExternalLink className="text-white text-2xl" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <FiImage className="text-xs" />
              <span className="truncate">{msg.fileName}</span>
              {msg.fileSize && <span>({msg.fileSize})</span>}
            </div>
          </div>
        );

      case "file":
        return (
          <a
            href={msg.text}
            download={msg.fileName}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/30 transition"
          >
            <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/40">
              <FiPaperclip className="text-sky-600 dark:text-sky-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{msg.fileName}</p>
              {msg.fileSize && (
                <p className="text-[10px] opacity-60">{msg.fileSize}</p>
              )}
            </div>
            <FiDownload className="text-xs opacity-50" />
          </a>
        );

      case "location":
        return (
          <a
            href={msg.text}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/30 transition"
          >
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40">
              <FiMapPin className="text-rose-600 dark:text-rose-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">موقعیت مکانی</p>
              <p className="text-[10px] opacity-60 truncate">
                {msg.lat?.toFixed(4)}, {msg.lng?.toFixed(4)}
              </p>
            </div>
            <FiExternalLink className="text-xs opacity-50" />
          </a>
        );

      default:
        return (
          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        );
    }
  };

  const badgeStyle =
    ticket?.status === "answered"
      ? "bg-emerald-200/70 text-emerald-800"
      : ticket?.status === "pending"
      ? "bg-yellow-200/70 text-yellow-800"
      : "bg-rose-200/70 text-rose-800";

  const statusLabel =
    ticket?.status === "answered"
      ? "پاسخ داده شده"
      : ticket?.status === "pending"
      ? "در انتظار پاسخ"
      : "بسته شده";

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white/30 dark:bg-[#1e2337]/80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white/30 dark:bg-[#1e2337]/80">
        <div className="text-center text-slate-500 dark:text-gray-400">
          <FiMessageSquare className="text-4xl mx-auto mb-2 opacity-50" />
          <p>تیکت یافت نشد</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen overflow-hidden">
      <main className="flex-1 min-w-0 flex flex-col h-screen bg-white/30 dark:bg-[#1e2337]/80 backdrop-blur-sm">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-600/50 bg-white/50 dark:bg-[#262B40]/50 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-slate-800 dark:text-gray-100 text-sm sm:text-base truncate">
                  {ticket.subject || ticket.title || "بدون عنوان"}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${badgeStyle}`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-gray-400">
                <FiClock className="text-xs" />
                <span>
                  {ticket.created_at
                    ? new Date(ticket.created_at).toLocaleDateString("fa-IR")
                    : ticket.createdAt || ""}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/customer-dashboard/support")}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FiChevronLeft className="text-slate-600 dark:text-gray-300 text-lg" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {!ticket.messages || ticket.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-gray-500">
              <FiMessageSquare className="text-4xl mb-2 opacity-50" />
              <p className="text-sm">هنوز پیامی ثبت نشده</p>
            </div>
          ) : (
            ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.isCustomer ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`
                    max-w-[88%] sm:max-w-[70%] md:max-w-[60%]
                    px-4 py-3 rounded-2xl text-sm
                    ${
                      msg.isCustomer
                        ? "bg-emerald-100/80 dark:bg-emerald-900/30 text-slate-800 dark:text-gray-100 rounded-tr-sm"
                        : "bg-sky-100/80 dark:bg-[#8AA1C4]/30 text-slate-800 dark:text-gray-100 rounded-tl-sm"
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {msg.isCustomer ? (
                      <FiUser className="text-xs text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <FiShield className="text-xs text-sky-600 dark:text-sky-300" />
                    )}
                    <span className="text-xs font-semibold opacity-70">
                      {msg.isCustomer ? "شما" : "پشتیبان"}
                    </span>
                    <span className="text-[10px] opacity-50 mr-auto pr-1">
                      {msg.time}
                    </span>
                  </div>
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200/50 dark:border-gray-600/50 bg-white/50 dark:bg-[#262B40]/50 backdrop-blur-lg relative">
          {/* Attachment Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-full left-4 sm:left-6 mb-2 p-2 rounded-2xl bg-white dark:bg-[#262B40] border border-gray-200 dark:border-gray-600 shadow-xl flex gap-2">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"
              >
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <FiImage className="text-purple-600 dark:text-purple-300" />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-gray-300">عکس</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"
              >
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <FiPaperclip className="text-amber-600 dark:text-amber-300" />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-gray-300">فایل</span>
              </button>
              <button
                onClick={handleLocationSend}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"
              >
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30">
                  <FiMapPin className="text-rose-600 dark:text-rose-300" />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-gray-300">لوکیشن</span>
              </button>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                <FiX className="text-xs" />
              </button>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "image")}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e, "file")}
          />

          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className={`
                p-3 rounded-2xl transition shrink-0
                ${
                  replyText.trim()
                    ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <FiSend className="text-lg" />
            </button>

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="پیام خود را بنویسید..."
              rows={1}
              className="
                flex-1 resize-none
                px-4 py-3 rounded-2xl
                bg-gray-50 dark:bg-[#1e2337]
                border border-gray-200 dark:border-gray-600
                text-slate-800 dark:text-gray-100 text-sm
                placeholder:text-slate-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600
                transition
              "
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />

            <button
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className={`
                p-3 rounded-2xl transition shrink-0
                ${showAttachmentMenu
                  ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300"
                  : "bg-gray-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              `}
            >
              <FiPaperclip className="text-lg" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}