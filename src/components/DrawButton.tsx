"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { performDrawAction } from "@/app/actions";

// One-time, fair draw trigger with a confirmation step and a dealing flourish.
export function DrawButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runDraw() {
    setError(null);
    setDealing(true);
    startTransition(async () => {
      const res = await performDrawAction();
      if (!res.ok) {
        setError(res.message);
        setDealing(false);
        setConfirming(false);
        return;
      }
      // Let the shuffle animation breathe before revealing the result.
      setTimeout(() => {
        router.refresh();
      }, 1100);
    });
  }

  return (
    <div className="text-center">
      <AnimatePresence mode="wait">
        {dealing ? (
          <motion.div
            key="dealing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-2"
          >
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="grid h-10 w-8 place-items-center rounded-md bg-wc-gold text-lg text-wc-charcoal shadow-glow"
                  animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }}
                >
                  ⚽
                </motion.span>
              ))}
            </div>
            <p className="display text-sm text-wc-gold">Dealing the teams…</p>
          </motion.div>
        ) : confirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-sm text-white/70">
              This draw is <strong className="text-white">one-time only</strong> and cannot be
              redone. Ready?
            </p>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={runDraw} disabled={pending}>
                🎲 Yes, deal the teams
              </button>
              <button className="btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="btn-primary text-lg"
            onClick={() => setConfirming(true)}
          >
            🎲 Randomly assign teams
          </motion.button>
        )}
      </AnimatePresence>
      {error && <p className="mt-3 text-sm text-wc-red">{error}</p>}
    </div>
  );
}
