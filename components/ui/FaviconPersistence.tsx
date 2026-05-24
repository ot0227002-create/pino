"use client";

import { useEffect } from "react";

export default function FaviconPersistence() {
  useEffect(() => {
    const savedFavicon = localStorage.getItem("appFavicon");
    if (!savedFavicon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = savedFavicon;
  }, []);

  return null;
}
