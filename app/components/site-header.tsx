"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PUBLIC_NAV_ITEMS } from "../../src/ui/public-navigation";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth >= 900) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [open]);

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <BrandMark />
        <nav
          aria-label="Primary navigation"
          className={`public-nav ${open ? "is-open" : ""}`}
          id="public-navigation"
        >
          {PUBLIC_NAV_ITEMS.map((item) => (
            <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link className="public-nav-mobile-cta" href="/app" onClick={() => setOpen(false)}>
            Launch app
          </Link>
        </nav>
        <Link className="public-header-cta" href="/app">
          Launch app <span aria-hidden="true">↗</span>
        </Link>
        <button
          aria-controls="public-navigation"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className={`public-menu-button ${open ? "is-open" : ""}`}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {open ? <button aria-label="Close navigation" className="public-nav-backdrop" onClick={() => setOpen(false)} type="button" /> : null}
    </header>
  );
}
