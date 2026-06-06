async function handleVerifyOTP(phone, otp) {
  try {
    const res = await fetch(`${API_BASE_URL}/verify-otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 🔥 حتما بزار تا کوکی ارسال بشه
      body: JSON.stringify({ phone, otp }),
    });

    const data = await res.json();

    if (data.status === "ok") {
      const role = data.user.role;

      if (role === "admin") {
        navigate("/dashboard/admin");
      } else {
        navigate("/dashboard/customer");
      }
    } else {
      setError(data.message);
    }
  } catch (err) {
    console.error(err);
    setError("خطا در تأیید OTP");
  }
}

