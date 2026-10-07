import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";
import { initOneSignal } from "./services/oneSignalService";

// Initialize OneSignal Push Service (gracefully no-ops if VITE_ONESIGNAL_APP_ID is not yet set)
initOneSignal().catch(() => {});

// Instant Auto-Update for Installed Mobile Phone PWA
let updateSW;
updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof updateSW === 'function') {
      updateSW(true);
    }
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

// Auto-reload immediately when new service worker takes control ONLY if an existing worker was already active (prevents reload on first subscription/install)
if ("serviceWorker" in navigator) {
  let refreshing = false;
  const hadExistingController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadExistingController && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);