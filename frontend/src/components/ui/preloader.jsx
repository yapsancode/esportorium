'use client'

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";

const MIN_DISPLAY_MS = 2000; // keep the preloader up at least this long for a smooth feel

// Controlled preloader: stays up until `done` is true AND the minimum display
// time has elapsed, then plays the slide-up exit animation. The parent flips
// `done` to true once its data has loaded (or failed).
export default function Preloader({ done = false }) {
  const loaderRef = useRef(null);
  const textRef = useRef(null);
  const startRef = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);

  // Once data is ready, wait out the remaining minimum display time, then leave.
  useLayoutEffect(() => {
    if (!done) return;
    const elapsed = Date.now() - startRef.current;
    const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timer = setTimeout(() => setLeaving(true), wait);
    return () => clearTimeout(timer);
  }, [done]);

  // Play the exit animation.
  useLayoutEffect(() => {
    if (!leaving || !loaderRef.current || !textRef.current) return;
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.set(loaderRef.current, { pointerEvents: "none", display: "none" });
      },
    });
    tl.to(textRef.current, { scale: 5, opacity: 0, duration: 0.8 });
    tl.to(
      loaderRef.current,
      {
        y: "-105%",
        borderBottomLeftRadius: "50% 20%",
        borderBottomRightRadius: "50% 20%",
        duration: 1,
      },
      "<"
    );
  }, [leaving]);

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black shadow-2xl"
      style={{
        transform: "translateY(0%)",
        borderBottomLeftRadius: "0%",
        borderBottomRightRadius: "0%",
      }}
    >
      <div
        ref={textRef}
        className="text-white text-3xl font-sans animate-pulse"
      >
        Getting Ready..
      </div>
    </div>
  );
}
