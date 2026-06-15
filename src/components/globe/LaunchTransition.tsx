"use client";

import { motion } from "framer-motion";

/**
 * Full-screen "warp to destination" transition played when the user commits to
 * planning a trip. Expanding teal rings + a spinning globe over a fade-to-navy
 * give a hyperspace feel before we route to the wizard.
 */
export function LaunchTransition({ destinationLabel }: { destinationLabel: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ background: "radial-gradient(ellipse at center, rgba(16,28,58,0.55), #0A0F1E)" }}
    >
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: "#00E5C3" }}
          initial={{ width: 36, height: 36, opacity: 0.7 }}
          animate={{ width: 1600, height: 1600, opacity: 0 }}
          transition={{ duration: 1.1, delay, ease: "easeOut" }}
        />
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center gap-3"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="text-5xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
        >
          🌍
        </motion.div>
        <p className="wp-display text-2xl text-white">{destinationLabel}</p>
        <motion.p
          className="text-sm text-slate-400"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          Plotting your route…
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
