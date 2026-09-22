"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

export function DemoBanner() {
  if (isFirebaseConfigured()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-amber-500/20 bg-amber-500/10"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-amber-300 sm:px-6">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-semibold">Demo Mode:</strong> Add your Firebase
          config to enable login and sync live data.
        </span>
      </div>
    </motion.div>
  );
}
