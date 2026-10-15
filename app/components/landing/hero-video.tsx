"use client";

import { useEffect, useRef, useState } from "react";

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (preference.matches) {
        video.current?.pause();
        setPaused(true);
      }
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  async function togglePlayback() {
    if (!video.current) return;
    if (video.current.paused) {
      try { await video.current.play(); } catch { setPaused(true); }
    } else {
      video.current.pause();
    }
  }

  return <>
    <video ref={video} aria-hidden="true" autoPlay className="landing-hero-video" loop muted playsInline poster="/brand/hero-background.svg" preload="metadata" tabIndex={-1} onPause={() => setPaused(true)} onPlay={() => setPaused(false)}>
      <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4" type="video/mp4" />
    </video>
    <button className="hero-motion-control" type="button" aria-label={paused ? "Play background video" : "Pause background video"} onClick={togglePlayback}><span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> {paused ? "Play motion" : "Pause motion"}</button>
  </>;
}
