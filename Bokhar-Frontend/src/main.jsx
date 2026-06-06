import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ToastContainer from "./context/ToastContainer";
import { ModalProvider } from "./context/ModalContext";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <ThemeProvider>
           <ModalProvider>
          <ToastProvider>
            <ToastContainer />
            <CartProvider>
              <App />
            </CartProvider>
          </ToastProvider>
          </ModalProvider>
        </ThemeProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
);
