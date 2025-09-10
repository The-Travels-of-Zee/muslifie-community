"use client";

import { Plane, Pizza, Coffee, Camera, Map, Utensils, Mountain, Wine } from "lucide-react";

const icons = [Plane, Pizza, Coffee, Camera, Map, Utensils, Mountain, Wine];

export default function Wallpaper() {
  // grid size (more cells = more icons)
  const rows = 20;
  const cols = 20;

  return (
    <div className="absolute inset-0 -z-10 bg-slate-50 overflow-hidden">
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const Icon = icons[i % icons.length];
          const rotate = Math.random() * 360;
          const size = 20 + Math.random() * 14; // 20–34px
          const opacity = 0.08 + Math.random() * 0.07;

          return (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ padding: "12px" }} // padding inside each cell
            >
              <Icon
                style={{
                  transform: `rotate(${rotate}deg)`,
                  fontSize: size,
                  opacity,
                }}
                className="text-neutral-500"
                strokeWidth={1.2}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
