const API_BASE = import.meta.env.VITE_API_URL;

// ------------------------- Send Register OTP -------------------------
export async function sendRegisterOtp(phone) {
  try {
    const res = await fetch(`${API_BASE}/send/otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();
    if (!res.ok) throw data;

    return data;
  } catch (err) {
    throw new Error(err?.message || "خطا در ارسال OTP");
  }
}

// ------------------------- Verify OTP + Register + Login -------------------------
export async function verifyRegisterOtp({ phone, otp, fullname }) {
  try {
    const res = await fetch(`${API_BASE}/register/otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phone,
        otp,
        fullname,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw data;


    return data;
  } catch (err) {
    throw new Error(err?.message || "خطا در تایید OTP");
  }
}

