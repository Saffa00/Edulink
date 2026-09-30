import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

// Instant Auto-Update for Installed Mobile Phone PWA
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(swScriptUrl, registration) {
    if (registration) {
      // Periodically check for updates every 5 minutes
      setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);

      // Check for updates whenever the phone app is opened or brought to foreground
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update().catch(() => {});
        }
      });
      window.addEventListener("focus", () => {
        registration.update().catch(() => {});
      });
    }
  }
});

// Auto-reload immediately when new service worker takes control so the phone gets new changes
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);