import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"; // instance‌ای که هدر Authorization رو خودکار اضافه می‌کنه

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState("loading"); // loading | success | failed

  useEffect(() => {
    const authority = params.get("Authority");
    const status = params.get("Status");

    if (!authority || status !== "OK") {
      setState("failed");
      return;
    }

    api
      .get("/payments/verify/", { params: { Authority: authority, Status: status } })
      .then((res) => {
        if (res.data.success) {
          setState("success");
          navigate(`/orders/${res.data.order_id}`, { replace: true });
        } else {
          setState("failed");
        }
      })
      .catch(() => setState("failed"));
  }, [params, navigate]);

  if (state === "loading") return <p>در حال تأیید پرداخت...</p>;
  if (state === "failed") return <p>پرداخت ناموفق بود یا لغو شد.</p>;
  return null;
}