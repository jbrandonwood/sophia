"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThinkingIndicator() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("text-muted-foreground/50 font-serif italic text-base animate-pulse")}>
      Contemplating{dots}
    </div>
  );
}
