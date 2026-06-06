import { useState, useEffect } from "react";

export function useSavedAddresses() {
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("savedAddresses");
    if (stored) setSavedAddresses(JSON.parse(stored));
  }, []);

  const addAddress = (address) => {
    if (savedAddresses.length >= 3) return false;
    const updated = [...savedAddresses, address];
    setSavedAddresses(updated);
    localStorage.setItem("savedAddresses", JSON.stringify(updated));
    return true;
  };

  const removeAddress = (index) => {
    const updated = savedAddresses.filter((_, i) => i !== index);
    setSavedAddresses(updated);
    localStorage.setItem("savedAddresses", JSON.stringify(updated));
  };

  return { savedAddresses, addAddress, removeAddress };
}
