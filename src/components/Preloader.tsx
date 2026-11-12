import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";

interface PreloaderProps {
  minDuration?: number;
}

export function Preloader({ minDuration = 650 }: PreloaderProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Ensure preloader displays long enough to feel graceful, then fades smoothly
    const startTime = performance.now();

    const handleReady = () => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setLoading(false);
        // Remove from DOM after opacity fade transition (400ms)
        setTimeout(() => {
          setVisible(false);
        }, 400);
      }, remaining);
    };

    if (document.readyState === "complete") {
      handleReady();
    } else {
      window.addEventListener("load", handleReady, { once: true });
      // Fallback in case load already fired or takes too long
      const fallbackTimer = setTimeout(handleReady, 1200);
      return () => {
        window.removeEventListener("load", handleReady);
        clearTimeout(fallbackTimer);
      };
    }
  }, [minDuration]);

  if (!mounted || !visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading Elsewhere"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400 ease-in-out ${
        loading ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex flex-col items-center text-center">
        {/* Animated Brand Emblem */}
        <div className="relative mb-5 flex size-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border border-sea/30 opacity-75" />
          <div className="flex size-14 items-center justify-center rounded-full border border-primary/25 bg-surface-soft text-primary shadow-sm">
            <Globe2 className="size-6 animate-pulse" aria-hidden="true" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
          elsewhere
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-sea">
          Travel, differently
        </p>

        {/* Elegant Thin Loading Bar */}
        <div className="mt-6 h-0.5 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full w-full origin-left animate-[shimmer_1.4s_infinite_linear] bg-primary" />
        </div>
      </div>
    </div>
  );
}
