import { Wallet, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

// ─── API Setup ───
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response?.data?.detail || "";
      if (msg.includes("Authentication")) {
        error.response.data.detail = "نشست شما منقضی شده، لطفاً دوباره وارد شوید";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Helpers ───
const toRial = (toman) => toman * 10;

const quickAmounts = [300000, 500000, 1000000];

function toEnglishNumber(str) {
  return str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

// ─── API Functions ───
const chargeWallet = (amountInRials) =>
  api.post("/payments/wallet/charge/", { amount: amountInRials });

const verifyWalletCharge = (authority, status) =>
  api.get("/payments/wallet/charge/verify/", {
    params: { Authority: authority, Status: status },
    headers: { Accept: "application/json" },
  });

const fetchWalletBalance = () =>
  api.get("/wallet/balance/");

// ─── Component ───
export default function WalletPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch balance on mount
  useEffect(() => {
    const getBalance = async () => {
      try {
        const response = await fetchWalletBalance();
        setBalance(response.data.balance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        toast.error("خطا در دریافت موجودی");
      } finally {
        setBalanceLoading(false);
      }
    }; 
    getBalance();
  }, []);

  // Handle callback from ZarinPal after wallet charge
  useEffect(() => {
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");

    if (authority && status) {
      verifyChargeCallback(authority, status);
    }
  }, [searchParams]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const verifyChargeCallback = async (authority, status) => {
    if (verifying) return;
    setVerifying(true);

    try {
      const response = await verifyWalletCharge(authority, status);

      if (response.data.success) {
        toast.success("کیف پول با موفقیت شارژ شد!");
        // Refresh balance after successful charge
        const balanceRes = await fetchWalletBalance();
        setBalance(balanceRes.data.balance);
      } else {
        toast.error(response.data.message || "شارژ ناموفق بود");
      }
    } catch (error) {
      console.error("Wallet charge verification error:", error);
      const msg = error.response?.data?.detail || error.response?.data?.message || "خطا در تأیید پرداخت";
      toast.error(msg);
    } finally {
      setVerifying(false);
      navigate("/wallet", { replace: true });
    }
  };

  const handleCharge = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("لطفاً مبلغ معتبر وارد کنید");
      return;
    }

    const amountInRial = toRial(Number(amount));

    if (amountInRial < 100000) {
      toast.error("حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است");
      return;
    }

    setLoading(true);
    try {
      const response = await chargeWallet(amountInRial);
      const { payment_url, authority, payment_uuid } = response.data;

      sessionStorage.setItem("pending_wallet_charge_uuid", payment_uuid);
      window.location.href = payment_url;
    } catch (error) {
      console.error("Wallet charge error:", error);
      const msg =
        error.response?.data?.amount?.[0] ||
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        "خطا در اتصال به درگاه پرداخت";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (rial) => {
    if (rial === null || rial === undefined) return "---";
    const toman = Math.floor(rial / 10);
    return toman.toLocaleString() + " تومان";
  };

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div
        className="
          rounded-2xl shadow-md p-5 md:max-w-3xl md:mx-auto mt-5 md:mt-16 mb-20 md:mb-0
          bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          border border-sky-200 dark:border-gray-700
          shadow-sky-200 dark:shadow-black/40
          transition
        "
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-[#262B40] flex items-center justify-center">
            <Wallet className="text-sky-600 dark:text-[#8AA1C4]" size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-200">
              کیف پول
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              افزایش موجودی کیف پول
            </p>
          </div>

          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full shadow-sm hover:shadow-md cursor-pointer
                          bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
                           dark:bg-[#262B40] dark:hover:bg-[#2d3350] dark:border-gray-600 dark:shadow-black/40 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Balance - Dynamic */}
        <div
          className="
          bg-white dark:bg-[#262B40]/60 
          border border-sky-200 dark:border-gray-700 
          rounded-2xl p-4 mb-6 transition
        "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
              <Wallet size={18} />
              <span className="text-sm">موجودی فعلی</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-200 mt-2 mr-1">
            {balanceLoading ? (
              <span className="text-gray-400 dark:text-gray-500 text-lg">در حال دریافت...</span>
            ) : (
              formatBalance(balance)
            )}
          </p>
        </div>

        {/* Quick amounts */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-200">
            انتخاب سریع مبلغ
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`
                  rounded-xl p-3 text-sm font-medium border transition cursor-pointer
                  ${
                    Number(amount) === a
                      ? "bg-sky-600 text-white border-sky-600 dark:bg-[#8AA1C4] dark:border-[#8AA1C4]"
                      : "bg-white dark:bg-[#262B40]/60 text-gray-900 dark:text-gray-200 border-sky-200 dark:border-gray-600 hover:bg-sky-50 dark:hover:bg-[#2d3350]"
                  }
                `}
              >
                {a.toLocaleString()} تومان
              </button>
            ))}
          </div>
        </div>

        {/* Manual input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">
            مبلغ دلخواه
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const englishValue = toEnglishNumber(e.target.value);
              if (/^\d*$/.test(englishValue)) {
                setAmount(englishValue);
              }
            }}
            placeholder="مثلاً 75000"
            className="
              w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8AA1C4] transition
              bg-white dark:bg-[#262B40]/60 border-sky-200 dark:border-gray-600 
              text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            "
          />
        </div>

        {/* Pay Button */}
        <button
          disabled={!amount || loading || verifying}
          onClick={handleCharge}
          className={`
            w-full rounded-xl p-3 transition font-medium flex items-center justify-center gap-2
            ${
              amount && !loading && !verifying
                ? "bg-sky-600 hover:bg-sky-700 text-white dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-[#262B40] dark:text-gray-500"
            }
          `}
        >
          {verifying ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              در حال تأیید پرداخت...
            </>
          ) : loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              در حال اتصال به درگاه...
            </>
          ) : (
            "پرداخت و افزایش موجودی"
          )}
        </button>
      </div>
    </div>
  );
}