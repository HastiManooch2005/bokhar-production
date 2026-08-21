import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

export function useAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/addresses/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("خطا در دریافت آدرس‌ها");
      const data = await res.json();
      setAddresses(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const createAddress = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/addresses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("خطا در ثبت آدرس");
      toast.success("آدرس با موفقیت ثبت شد");
      await fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const updateAddress = async (id, payload) => {
    try {
      const res = await fetch(`${API_URL}/addresses/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("خطا در بروزرسانی آدرس");
      toast.success("آدرس بروزرسانی شد");
      await fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const deleteAddress = async (id) => {
    try {
      const res = await fetch(`${API_URL}/addresses/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("خطا در حذف آدرس");
      toast.success("آدرس حذف شد");
      await fetchAddresses();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const incrementUsage = async (id) => {
    try {
      await fetch(`${API_URL}/addresses/${id}/use/`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // silently fail
    }
  };

  const getLeastUsed = () => {
    if (!addresses.length) return null;
    return [...addresses].sort((a, b) => {
      if (a.usage_count !== b.usage_count) {
        return a.usage_count - b.usage_count;
      }
      return new Date(a.created_at) - new Date(b.created_at);
    })[0];
  };

  return {
    addresses,
    loading,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    incrementUsage,
    getLeastUsed,
  };
}