"use client"

import { motion } from "framer-motion"
import { VideoWrapper } from "@/components/ui/VideoWrapper"

const BG = "#070708"

export function PhoneVideo() {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 15 }}
      className="size-full relative overflow-hidden"
      style={{ borderRadius: "2.3rem", background: BG, minWidth: 0 }}
    >
      <VideoWrapper
        src="/hero-intro.mp4"
        poster="/hero-poster.webp"
        className="size-full"
        posterClassName="object-cover"
      />
    </motion.div>
  )
}
