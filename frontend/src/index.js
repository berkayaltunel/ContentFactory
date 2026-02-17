import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Clear Supabase OAuth hash fragment immediately to prevent auto-scroll
if (window.location.hash && window.location.hash.includes('access_token')) {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
