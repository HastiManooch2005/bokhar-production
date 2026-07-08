// src/hooks/useTickets.js — Custom Hook برای مدیریت تیکت‌ها
import { useState, useEffect, useCallback } from "react";
import {
  getAdminTickets,
  getTicketDetail,
  replyToTicket,
  closeTicketAdmin,
} from "../api/ticketApi";

export function useAdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTickets(params);
      setTickets(data);
      return data;
    } catch (err) {
      const msg =
        err.status === 403
          ? "شما دسترسی به این بخش را ندارید"
          : "خطا در دریافت تیکت‌ها";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeTicket = useCallback(async (id) => {
    try {
      await closeTicketAdmin(id);
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "closed" } : t))
      );
    } catch (err) {
      throw err;
    }
  }, []);

  return { tickets, loading, error, fetchTickets, closeTicket, setTickets };
}

export function useTicketDetail(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketDetail(ticketId);
      setTicket(data);
      return data;
    } catch (err) {
      const status = err.status;
      const msg =
        status === 403
          ? "شما دسترسی به این تیکت را ندارید"
          : status === 404
          ? "تیکت مورد نظر یافت نشد"
          : "خطا در دریافت اطلاعات تیکت";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const sendReply = useCallback(
    async (data) => {
      setSending(true);
      try {
        const response = await replyToTicket(ticketId, data);
        setTicket(response);
        return response;
      } catch (err) {
        throw err;
      } finally {
        setSending(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return {
    ticket,
    loading,
    sending,
    error,
    fetchTicket,
    sendReply,
    setTicket,
  };
}