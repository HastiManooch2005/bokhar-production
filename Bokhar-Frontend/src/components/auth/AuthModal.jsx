import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { X } from "lucide-react";
import BaseModal from "../basemodal/BaseModal";
import RegisterPhoneForm from "./register/RegisterPhoneForm";
import RegisterOtpForm from "./register/RegisterOtpForm";
import LoginForm from "./login/LoginForm";

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState("register-phone");

  const [registerPhone, setRegisterPhone] = useState("");
  const [registerFullname, setRegisterFullname] = useState("");

  if (!isOpen) return null;

  return (
    <>
      <Toaster position="top-right" />

      <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="sm">
        <div dir="rtl" className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close auth modal"
            className="
              hidden md:flex
              absolute top-2 -left-4
              items-center justify-center
              w-9 h-9 rounded-full
              hover:bg-white text-black
              dark:hover:bg-[#262B40] dark:text-gray-200 dark:hover:text-gray-100
              transition
              z-10
            "
          >
            <X className="w-5 h-5" />
          </button>

          {/* REGISTER – PHONE */}
          {mode === "register-phone" && (
            <RegisterPhoneForm
              onNext={({ phone, fullname }) => {
                setRegisterPhone(phone);
                setRegisterFullname(fullname);
                setMode("register-otp");
              }}
              onSwitchLogin={() => setMode("login")}
            />
          )}

          {/* REGISTER – OTP */}
          {mode === "register-otp" && (
            <RegisterOtpForm
              phone={registerPhone}
              fullname={registerFullname}
              onBack={() => setMode("register-phone")}
              onSuccess={() => {
                // ✅ ابتدا success callback رو صدا می‌زنیم (برای رفرش سبد)
                if (onSuccess) onSuccess();
                // بعد مودال رو می‌بندیم
                onClose();
              }}
            />
          )}

          {/* LOGIN */}
          {mode === "login" && (
            <LoginForm
              onSwitchRegister={() => setMode("register-phone")}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </BaseModal>
    </>
  );
}