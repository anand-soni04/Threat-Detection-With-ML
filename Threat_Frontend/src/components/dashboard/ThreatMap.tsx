"use client";

import { useEffect, useRef } from "react";

const threatLocations = [
  { country: "Russia", attacks: 234, x: 65, y: 25 },
  { country: "China", attacks: 189, x: 75, y: 40 },
  { country: "USA", attacks: 156, x: 20, y: 35 },
  { country: "Brazil", attacks: 87, x: 30, y: 65 },
  { country: "India", attacks: 76, x: 70, y: 48 },
  { country: "Germany", attacks: 54, x: 52, y: 30 },
  { country: "Nigeria", attacks: 43, x: 50, y: 55 },
  { country: "Iran", attacks: 38, x: 60, y: 40 },
];

export default function ThreatMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawMap();
    };

    const drawMap = () => {
      ctx.fillStyle = "#161b22";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 0.5;

      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo((canvas.width / 10) * i, 0);
        ctx.lineTo((canvas.width / 10) * i, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, (canvas.height / 10) * i);
        ctx.lineTo(canvas.width, (canvas.height / 10) * i);
        ctx.stroke();
      }

      // Draw threat hotspots with pulsing effect
      threatLocations.forEach((loc) => {
        const x = (loc.x / 100) * canvas.width;
        const y = (loc.y / 100) * canvas.height;
        const radius = Math.min(8 + loc.attacks / 20, 25);

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, "rgba(248, 81, 73, 0.6)");
        gradient.addColorStop(0.5, "rgba(248, 81, 73, 0.2)");
        gradient.addColorStop(1, "rgba(248, 81, 73, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = "#f85149";
        ctx.beginPath();
        ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Animation loop for pulsing effect
    let animationId: number;
    let alpha = 0;
    const animate = () => {
      alpha += 0.05;
      drawMap();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[250px] rounded-lg"
      />
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
        {threatLocations.slice(0, 4).map((loc) => (
          <div
            key={loc.country}
            className="flex items-center gap-2 bg-secondary/80 px-2 py-1 rounded text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-foreground">{loc.country}</span>
            <span className="text-muted-foreground">{loc.attacks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
