"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease } from "@/lib/easings";
import { cn } from "@/lib/utils";

// One motion vocabulary for the whole landing page.
export const EASE_OUT = ease.power2Out;
export const DURATION = 0.3;
export const REVEAL_Y = 12;
export const REVEAL_BLUR = "blur(4px)";
export const HERO_STAGGER = 0.1;

const reveal = (reduced: boolean | null, y: number) =>
  reduced
    ? { opacity: 0 }
    : { opacity: 0, y, filter: REVEAL_BLUR };

const settle = { opacity: 1, y: 0, filter: "blur(0px)" };

/**
 * Scroll reveal: opacity, 4px blur and 12px rise over 300ms, easing out.
 * Plays once per element. With reduced motion it degrades to an opacity
 * cross-fade and drops the translate and blur entirely.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = REVEAL_Y,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reveal(reduced, y)}
      whileInView={settle}
      // The negative top margin makes a section start its reveal slightly after
      // it appears. The bottom edge must stay unshrunk: the last element in the
      // scroll container can never clear a bottom margin, so shrinking it would
      // leave the footer stuck at opacity 0 forever.
      viewport={{ once: true, margin: "-72px 0px 0px 0px" }}
      transition={{ duration: DURATION, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hero entrance. Same treatment as Reveal but staggered and restricted to first
 * load, so scrolling back to the top never replays it.
 */
export function HeroEnter({
  children,
  className,
  step = HERO_STAGGER,
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <>
      {children.map((child, index) => (
        <motion.div
          key={index}
          className={className}
          initial={reveal(reduced, REVEAL_Y)}
          animate={settle}
          transition={{ duration: DURATION, delay: index * step, ease: EASE_OUT }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

/**
 * Press feedback for links styled as buttons. Only the press animates, never the
 * hover, so high-frequency pointer movement stays cheap.
 */
export function pressable(className?: string) {
  // The button base already sets transition-property via a transition-[...] utility.
  // Adding a second one loses on CSS source order (identical specificity, later
  // rule wins), which silently drops `transform`. Tailwind v4's `scale` is a
  // separate property from `transform`, so animating it needs no change to
  // transition-property and cannot collide with the base.
  return cn(
    className,
    "transition-scale duration-150 ease-power2-out active:scale-[0.96]"
  );
}