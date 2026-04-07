"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";

export const TextHoverEffect = ({
  text,
  duration,
  className,
  colors = ["#2563eb", "#38bdf8", "#8b5cf6", "#fb7185"],
  baseFill = "rgba(15, 23, 42, 0.96)",
  baseStroke = "rgba(148, 163, 184, 0.18)",
  align = "left",
  strokeWidth = 0.6,
}: {
  text: string;
  duration?: number;
  className?: string;
  automatic?: boolean;
  colors?: string[];
  baseFill?: string;
  baseStroke?: string;
  align?: "left" | "center" | "right";
  strokeWidth?: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
  const textAnchor =
    align === "center" ? "middle" : align === "right" ? "end" : "start";
  const textX = align === "center" ? "50%" : align === "right" ? "100%" : "0%";

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
      setMaskPosition({
        cx: `${cxPercentage}%`,
        cy: `${cyPercentage}%`,
      });
    }
  }, [cursor]);

  return (
    <svg
      aria-label={text}
      className={className ?? ""}
      ref={svgRef}
      preserveAspectRatio={
        align === "center" ? "xMidYMid meet" : align === "right" ? "xMaxYMid meet" : "xMinYMid meet"
      }
      viewBox="0 0 1000 140"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient
          id={`textGradient-${id}`}
          gradientUnits="userSpaceOnUse"
          cx="50%"
          cy="50%"
          r="25%"
        >
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="30%" stopColor={colors[1] ?? colors[0]} />
          <stop offset="68%" stopColor={colors[2] ?? colors[1] ?? colors[0]} />
          <stop offset="100%" stopColor={colors[3] ?? colors[0]} />
        </linearGradient>

        <motion.radialGradient
          id={`revealMask-${id}`}
          gradientUnits="userSpaceOnUse"
          r={hovered ? "26%" : "18%"}
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="55%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={`textMask-${id}`}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#revealMask-${id})`}
          />
        </mask>
      </defs>
      <text
        x={textX}
        y="50%"
        dominantBaseline="middle"
        fill={baseFill}
        stroke={baseStroke}
        strokeWidth={strokeWidth}
        style={{
          fontFamily: "inherit",
          fontSize: "1em",
          fontWeight: "inherit",
          letterSpacing: "inherit",
        }}
        textAnchor={textAnchor}
      >
        {text}
      </text>
      <motion.text
        x={textX}
        y="50%"
        dominantBaseline="middle"
        fill="transparent"
        initial={{ opacity: 0, strokeDashoffset: 560, strokeDasharray: 560 }}
        animate={{
          opacity: hovered ? 0.9 : 0.45,
          strokeDashoffset: hovered ? 0 : 560,
          strokeDasharray: 560,
        }}
        stroke={baseStroke}
        strokeWidth={strokeWidth}
        style={{
          fontFamily: "inherit",
          fontSize: "1em",
          fontWeight: "inherit",
          letterSpacing: "inherit",
        }}
        textAnchor={textAnchor}
        transition={{
          duration: hovered ? 0.55 : 0.25,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>
      <motion.text
        x={textX}
        y="50%"
        dominantBaseline="middle"
        fill={`url(#textGradient-${id})`}
        initial={{ opacity: 0 }}
        animate={{
          opacity: hovered ? 1 : 0.82,
        }}
        mask={`url(#textMask-${id})`}
        stroke="transparent"
        strokeWidth={strokeWidth}
        style={{
          fontFamily: "inherit",
          fontSize: "1em",
          fontWeight: "inherit",
          letterSpacing: "inherit",
        }}
        textAnchor={textAnchor}
        transition={{
          duration: hovered ? 0.28 : 0.18,
          ease: "easeOut",
        }}
      >
        {text}
      </motion.text>
    </svg>
  );
};
