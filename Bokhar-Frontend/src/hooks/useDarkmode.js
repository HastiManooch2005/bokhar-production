import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDark = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return isDarkMode;
}
