"use client";

import { useState, useEffect } from "react";

export function RealTimeClock() {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <>{currentTime}</>;
}
