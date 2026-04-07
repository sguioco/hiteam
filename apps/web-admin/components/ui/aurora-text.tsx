import React, { memo } from "react"

interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
  animated?: boolean
}

export const AuroraText = memo(
  ({
    children,
    className = "",
    colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
    speed = 1,
    animated = true,
  }: AuroraTextProps) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${
        colors[0]
      })`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${10 / speed}s`,
    }

    return (
      <span
        className={`relative inline-block overflow-visible align-baseline [line-height:inherit] ${className}`}
      >
        <span className="sr-only">{children}</span>
        <span
          className={`${animated ? "animate-aurora will-change-[background-position]" : ""} relative inline-block overflow-visible bg-[length:220%_220%] bg-clip-text px-[0.02em] pr-[0.08em] pb-[0.08em] text-transparent [line-height:inherit]`}
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    )
  }
)

AuroraText.displayName = "AuroraText"
