import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTicketDetail, sendTicketMessage, closeTicket } from "../../../api/ticketApi";

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
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";

export default function CustomerTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [ticket, setTicket] = useState(null);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketDetail(id);
      setTicket(data);
      return data;
    } catch (err) {
      console.error("Error fetching ticket:", err);
      if (err.status === 403) {
        setError("شما دسترسی به این تیکت را ندارید");
      } else if (err.status === 404) {
        setError("تیکت مورد نظر یافت نشد");
      } else {
        setError("خطا در دریافت اطلاعات تیکت");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (ticket?.messages) {
      scrollToBottom();
    }
  }, [ticket?.messages]);

  // ========================== ارسال پیام ==========================

 const sendMessage = async (content, type, extra = {}) => {
    setSending(true);
    try {
      let data;

      if (type === "file" || type === "image") {
        data = new FormData();
        data.append("file", extra.file);        // ← اسم فیلد "file"
        data.append("body", "");                 // ← body خالی
        data.append("file_name", extra.file.name);
        data.append("file_type", detectFileType(extra.file));
      } else if (type === "location") {
        data = {
          body: content,
          latitude: extra.lat,
          longitude: extra.lng,
        };
      } else {
        data = { body: content };
      }

      const response = await sendTicketMessage(id, data);
      setTicket(response);
      setReplyText("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert(err.body?.[0] || err.detail || "خطا در ارسال پیام");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    await sendMessage(replyText.trim(), "text");
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

    // اعتبارسنجی سایز (مثلاً 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      alert("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد");
      e.target.value = "";
      return;
    }

    sendMessage(null, type, { file });
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
        sendMessage(mapsUrl, "location", { lat: latitude, lng: longitude });
        setShowAttachmentMenu(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("دسترسی به موقعیت مکانی رد شد یا خطا رخ داد");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCloseTicket = async () => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این تیکت را ببندید؟")) return;
    try {
      await closeTicket(id);
      setTicket((prev) => ({ ...prev, status: "closed" }));
    } catch (err) {
      console.error("Error closing ticket:", err);
      alert("خطا در بستن تیکت");
    }
  };

  // ========================== رندر پیام ==========================

  const renderMessageContent = (msg) => {
    const type = msg.file_type || "text";

    switch (type) {
      case "image":
        return (
          <div className="space-y-2">
            <div className="relative group">
              <img
                src={msg.file_url || msg.body}
                alt={msg.file_name || "تصویر"}
                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                onClick={() => window.open(msg.file_url || msg.body, "_blank")}
                onError={(e) => {
                  e.target.src = "";
                  e.target.alt = "خطا در بارگذاری تصویر";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <FiExternalLink className="text-white text-2xl" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-70">
              <FiImage className="text-xs" />
              <span className="truncate">{msg.file_name || "تصویر"}</span>
            </div>
          </div>
        );

      case "file":
      case "video":
      case "audio":
        return (
          <a
            href={msg.file_url || msg.body}
            download={msg.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/30 transition"
          >
            <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/40">
              <FiPaperclip className="text-sky-600 dark:text-sky-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {msg.file_name || "فایل"}
              </p>
              <p className="text-[10px] opacity-50">
                {type === "video" ? "ویدیو" : type === "audio" ? "صوت" : "فایل"}
              </p>
            </div>
            <FiDownload className="text-xs opacity-50" />
          </a>
        );

      case "location":
        return (
          <a
            href={msg.body}
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
                {msg.latitude?.toFixed(4)}, {msg.longitude?.toFixed(4)}
              </p>
            </div>
            <FiExternalLink className="text-xs opacity-50" />
          </a>
        );

      default:
        return (
          <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
        );
    }
  };

  // ========================== رندر UI ==========================

  if (loading && !ticket) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center text-slate-400">
          <FiLoader className="text-4xl mb-3 animate-spin" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center text-rose-500">
          <FiAlertCircle className="text-4xl mb-3" />
          <p>{error}</p>
          <button
            onClick={() => navigate("/customer-dashboard/support")}
            className="mt-4 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm hover:bg-sky-600 transition"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  const status = ticket?.status || "open";
  const badgeStyle =
    status === "answered"
      ? "bg-emerald-200/70 text-emerald-800"
      : status === "open"
      ? "bg-yellow-200/70 text-yellow-800"
      : "bg-rose-200/70 text-rose-800";

  const statusLabel =
    status === "answered"
      ? "پاسخ داده شده"
      : status === "open"
      ? "در انتظار پاسخ"
      : "بسته شده";

  const formattedDate = ticket?.created_at
    ? new Date(ticket.created_at).toLocaleDateString("fa-IR")
    : "";

  return (
    <div dir="rtl" className="flex min-h-screen overflow-hidden">
      <main className="flex-1 min-w-0 flex flex-col h-screen bg-white/30 dark:bg-[#1e2337]/80 backdrop-blur-sm">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-600/50 bg-white/50 dark:bg-[#262B40]/50 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-slate-800 dark:text-gray-100 text-sm sm:text-base truncate">
                  {ticket?.subject || "تیکت"}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${badgeStyle}`}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-gray-400">
                <FiClock className="text-xs" />
                <span>{formattedDate}</span>
              </div>
            </div>
            {status !== "closed" && (
              <button
                onClick={handleCloseTicket}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition"
              >
                بستن تیکت
              </button>
            )}
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
          {!ticket?.messages || ticket.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-gray-500">
              <FiMessageSquare className="text-4xl mb-2 opacity-50" />
              <p className="text-sm">هنوز پیامی ثبت نشده</p>
            </div>
          ) : (
            ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`
                    max-w-[88%] sm:max-w-[70%] md:max-w-[60%]
                    px-4 py-3 rounded-2xl text-sm
                    ${
                      msg.is_admin
                        ? "bg-sky-100/80 dark:bg-[#8AA1C4]/30 text-slate-800 dark:text-gray-100 rounded-tr-sm"
                        : "bg-emerald-100/80 dark:bg-emerald-900/30 text-slate-800 dark:text-gray-100 rounded-tl-sm"
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {msg.is_admin ? (
                      <FiShield className="text-xs text-sky-600 dark:text-sky-300" />
                    ) : (
                      <FiUser className="text-xs text-emerald-600 dark:text-emerald-300" />
                    )}
                    <span className="text-xs font-semibold opacity-70">
                      {msg.is_admin ? "پشتیبان" : "شما"}
                    </span>
                    <span className="text-[10px] opacity-50 mr-auto pr-1">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString("fa-IR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
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
        {status !== "closed" && (
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
              accept=".pdf,.doc,.docx,.zip,.rar,.txt"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "file")}
            />

            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || sending}
                className={`
                  p-3 rounded-2xl transition shrink-0
                  ${
                    replyText.trim() && !sending
                      ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {sending ? (
                  <FiLoader className="text-lg animate-spin" />
                ) : (
                  <FiSend className="text-lg" />
                )}
              </button>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="پیام خود را بنویسید..."
                rows={1}
                disabled={sending}
                className="
                  flex-1 resize-none
                  px-4 py-3 rounded-2xl
                  bg-gray-50 dark:bg-[#1e2337]
                  border border-gray-200 dark:border-gray-600
                  text-slate-800 dark:text-gray-100 text-sm
                  placeholder:text-slate-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-600
                  transition disabled:opacity-50
                "
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />

              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                disabled={sending}
                className={`
                  p-3 rounded-2xl transition shrink-0
                  ${showAttachmentMenu
                    ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300"
                    : "bg-gray-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }
                  disabled:opacity-50
                `}
              >
                <FiPaperclip className="text-lg" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// helper محلی
function detectFileType(file) {
  if (!file) return "";
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}