"use client";

import { useEffect, useState } from "react";

export function CopyableCode({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMessage("");
  }, [value]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied");
    } catch { setMessage("Copy unavailable. Select the value to copy it manually."); }
  }

  return <div className="copyable-code"><code translate="no">{value}</code><button type="button" className="secondary" aria-label={`Copy ${label}`} onClick={copy}>Copy</button><span aria-live="polite" className="copy-feedback">{message}</span></div>;
}
