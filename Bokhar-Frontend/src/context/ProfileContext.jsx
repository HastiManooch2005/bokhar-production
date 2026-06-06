import { createContext, useContext } from "react";
import { useAuth, ensureCSRFToken } from "./AuthContext";

const ProfileContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL;

export function ProfileProvider({ children }) {
  const { user, setUser } = useAuth();

  // ================= edit full name =================
  const editFullName = async (fullname) => {
    const csrfToken = await ensureCSRFToken();

    const res = await fetch(`${API_BASE}/edit/name/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ fullname }),
    });

    const contentType = res.headers.get("Content-Type") || "";
    let result;

    if (contentType.includes("application/json")) {
      result = await res.json();
    } else {
      const text = await res.text();
      throw new Error("خطای سرور. دوباره تلاش کنید.");
    }

    if (!res.ok) throw result;

    setUser((prev) => ({ ...prev, fullname }));
    return result;
  };

  // ================= edit password =================
  const editPassword = async (data) => {
    const csrfToken = await ensureCSRFToken();

    const res = await fetch(`${API_BASE}/edit/password/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const contentType = res.headers.get("Content-Type") || "";
    let result;

    if (contentType.includes("application/json")) {
      try {
        result = await res.json();
      } catch {
        throw new Error("خطای سرور. دوباره تلاش کنید.");
      }
    } else {
      const text = await res.text();
      throw new Error("خطای سرور. دوباره تلاش کنید.");
    }

    if (!res.ok) throw result;
    return result;
  };

  return (
    <ProfileContext.Provider
      value={{
        editFullName,
        editPassword,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
};
