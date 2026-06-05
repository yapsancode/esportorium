import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";

const MIN_DISPLAY_MS = 3000; // 3000 miliseconds

export default function Preloader({ show = true }) {
  const loaderRef = useRef(null);
  const textRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Wait for both document.readyState === "complete" AND the minimum delay
  useLayoutEffect(() => {
    if (!show) return;

    let animationFrame;
    const startTime = Date.now();

    const checkReady = () => {
      const elapsed = Date.now() - startTime;
      if (document.readyState === "complete" && elapsed >= MIN_DISPLAY_MS) {
        setLoaded(true);
      } else {
        animationFrame = requestAnimationFrame(checkReady);
      }
    };

    checkReady();
    return () => cancelAnimationFrame(animationFrame);
  }, [show]);

  // Run exit animation once the delay + readiness condition is met
  useLayoutEffect(() => {
    if (!show) return;

    if (loaded && loaderRef.current && textRef.current) {
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: () => {
          gsap.set(loaderRef.current, {
            pointerEvents: "none",
            display: "none",
          });
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
    }
  }, [loaded, show]);

  if (!show) return null;

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
