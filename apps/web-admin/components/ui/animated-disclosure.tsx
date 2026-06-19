"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type AnimatedDisclosureProps = {
  children: ReactNode;
  className?: string;
  show: boolean;
};

export function AnimatedDisclosure({
  children,
  className,
  show,
}: AnimatedDisclosureProps) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          animate={{
            filter: "blur(0px)",
            height: "auto",
            opacity: 1,
            y: 0,
          }}
          className={cn("overflow-hidden", className)}
          exit={{
            filter: "blur(3px)",
            height: 0,
            opacity: 0,
            y: -4,
          }}
          initial={{
            filter: "blur(3px)",
            height: 0,
            opacity: 0,
            y: -6,
          }}
          transition={{
            filter: { duration: 0.18, ease: [0.2, 0, 0, 1] },
            height: { duration: 0.28, ease: [0.2, 0, 0, 1] },
            opacity: { duration: 0.18, ease: [0.2, 0, 0, 1] },
            y: { duration: 0.24, ease: [0.2, 0, 0, 1] },
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
