// src/api/ticketApi.js — سرویس تیکت‌ها (HTTP-only cookie)
const API_BASE = import.meta.env.VITE_API_URL;

// ============================ helpers ============================

/**
 * ساخت FormData از entries ذخیره‌شده (برای retry بعد از 401)
 */
function rebuildFormData(entries) {
  const fd = new FormData();
  entries.forEach(([key, value]) => fd.append(key, value));
  return fd;
}

/**
 * ذخیره entries یک FormData برای rebuild
 */
function captureFormData(formData) {
  const entries = [];
  for (const [key, value] of formData.entries()) {
    entries.push([key, value]);
  }
  return entries;
}

/**
 * تشخیص نوع فایل از MIME type
 */
function detectFileType(file) {
  if (!file) return "";
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

// ============================ base fetch ============================

async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  let formDataEntries = null;

  if (isFormData) {
    formDataEntries = captureFormData(options.body);
  }

  const doFetch = (body) =>
    fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: "include",
      body,
      headers: isFormData
        ? options.headers
        : {
            "Content-Type": "application/json",
            ...options.headers,
          },
    });

  let res = await doFetch(options.body);

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/refresh/`, {
      method: "POST",
      credentials: "include",
    });

    if (!refreshRes.ok) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const retryBody = isFormData
      ? rebuildFormData(formDataEntries)
      : options.body;

    const retryRes = await doFetch(retryBody);

    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({}));
      throw { status: retryRes.status, ...err };
    }
    return retryRes;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }

  return res;
}

// ========================== کاربر (مشتری) ==========================

export const getUserTickets = () =>
  apiFetch("/tickets/").then((r) => r.json());

export const createTicket = (data) =>
  apiFetch("/tickets/", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const getTicketDetail = (id) =>
  apiFetch(`/tickets/${id}/`).then((r) => r.json());

export const closeTicket = (id) =>
  apiFetch(`/tickets/${id}/`, { method: "DELETE" });

// ========================== ارسال پیام (مشتری) ==========================

export const sendTicketMessage = async (id, data) => {
  let body, headers = {};
  let formDataEntries = null;

  if (data instanceof FormData) {
    body = data;
    formDataEntries = captureFormData(data);
  } else {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  }

  const isFormData = data instanceof FormData;

  const doFetch = (reqBody) =>
    fetch(`${API_BASE}/tickets/${id}/messages/`, {
      method: "POST",
      credentials: "include",
      headers: isFormData ? {} : headers,
      body: reqBody,
    });

  let res = await doFetch(body);

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/refresh/`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshRes.ok) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const retryBody = isFormData ? rebuildFormData(formDataEntries) : body;
    res = await doFetch(retryBody);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }

  return res.json();
};

// ========================== ادمین / فروشنده ==========================

export const getAdminTickets = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all")
    query.append("status", params.status);
  if (params.search?.trim()) query.append("search", params.search.trim());

  const qs = query.toString();
  return apiFetch(`/admin/tickets/${qs ? `?${qs}` : ""}`).then((r) => r.json());
};

// ========================== پاسخ ادمین ==========================

export const replyToTicket = async (id, data) => {
  let body, headers = {};
  let formDataEntries = null;

  if (data instanceof FormData) {
    body = data;
    formDataEntries = captureFormData(data);
  } else {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  }

  const isFormData = data instanceof FormData;

  const doFetch = (reqBody) =>
    fetch(`${API_BASE}/admin/tickets/${id}/reply/`, {
      method: "POST",
      credentials: "include",
      headers: isFormData ? {} : headers,
      body: reqBody,
    });

  let res = await doFetch(body);

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/refresh/`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshRes.ok) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const retryBody = isFormData ? rebuildFormData(formDataEntries) : body;
    res = await doFetch(retryBody);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, ...err };
  }

  return res.json();
};

export const closeTicketAdmin = (id) =>
  apiFetch(`/tickets/${id}/`, { method: "DELETE" });