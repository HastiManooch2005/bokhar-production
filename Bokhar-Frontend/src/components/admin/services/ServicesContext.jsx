import { createContext, useState, useEffect } from "react";
import api from "./servicesApi";

export const ServicesContext = createContext();

export function ServicesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [initialized, setInitialized] = useState(false);

  const refreshData = async () => {
    try {
      const [cats, products] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ]);

      setCategories(cats);
      setServices(products);

      // ✅ فقط بعد از دریافت موفق
      localStorage.setItem("categories", JSON.stringify(cats));
      localStorage.setItem("services", JSON.stringify(products));
    } catch (err) {
      console.error("خطا در ری‌فرش داده‌ها:", err);
    }
  };

  useEffect(() => {
    // ✅ فقط برای load اولیه
    try {
      const cats = JSON.parse(localStorage.getItem("categories") || "[]");
      const svcs = JSON.parse(localStorage.getItem("services") || "[]");
      setCategories(cats);
      setServices(svcs);
    } catch {}

    refreshData().finally(() => setInitialized(true));
  }, []);

  if (!initialized) return null; // یا loader

  return (
    <ServicesContext.Provider
      value={{ categories, services, refreshData }}
    >
      {children}
    </ServicesContext.Provider>
  );
}
