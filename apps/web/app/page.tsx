"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Activity, Lock, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-hidden font-sans">
      {/* 1. Background Grid & Glows */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#2a2a2a_1px,transparent_1px),linear-gradient(to_bottom,#2a2a2a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      {/* 2. Navigation (Cleaned Up - No Pricing/Docs) */}
      <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
            <div className="relative h-10 w-10 bg-black border border-zinc-800 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-500 fill-blue-500/20" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            TriaGen
          </span>
        </div>

        <Link
          href="/login"
          className="group relative px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all flex items-center gap-2 overflow-hidden"
        >
          <span className="relative z-10 text-sm font-semibold text-zinc-300 group-hover:text-white">
            Access Console
          </span>
          <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </Link>
      </nav>

      {/* 3. Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-10 pb-20 px-6 text-center max-w-5xl mx-auto">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800/60 backdrop-blur-md mb-8 hover:border-blue-500/30 transition-colors cursor-default"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
            System Operational
          </span>
          <div className="h-4 w-[1px] bg-zinc-800"></div>
          <span className="text-xs text-zinc-300 font-medium">v2.4 Live</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 text-white"
        >
          Zero <span className="text-zinc-600">Downtime.</span>
          <br />
          Maximum <span className="text-blue-500">Velocity.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed font-light"
        >
          The incident management protocol for high-performance engineering
          teams. Detect, Escalate, and Resolve without leaving your terminal
          mindset.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-6 w-full justify-center items-center"
        >
          {/* ✅ FIXED: Link points to /signup instead of /register */}
          <Link href="/signup" className="w-full sm:w-auto">
            <button className="h-14 px-10 rounded-xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all w-full sm:w-auto flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02]">
              Deploy Workspace{" "}
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
            </button>
          </Link>
        </motion.div>
      </main>

      {/* 4. High-Tech Feature Grid (No more simple boxes) */}
      <section className="relative z-10 pb-32 pt-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Real-time Core */}
            <FeatureTile
              delay={0.4}
              icon={<Cpu className="h-6 w-6 text-cyan-400" />}
              title="WebSocket Engine"
              subtitle="Sub-millisecond latency updates for instant team synchronization."
              metric="0.4ms"
              metricLabel="Latency"
            />

            {/* Feature 2: Secure Vault */}
            <FeatureTile
              delay={0.5}
              icon={<Lock className="h-6 w-6 text-purple-400" />}
              title="S3 Evidence Vault"
              subtitle="Military-grade encryption for logs, dumps, and post-mortem assets."
              metric="AES-256"
              metricLabel="Encryption"
            />

            {/* Feature 3: Auto-Escalation */}
            <FeatureTile
              delay={0.6}
              icon={<Activity className="h-6 w-6 text-red-400" />}
              title="SLA Watchdog"
              subtitle="Automated background workers monitor breach thresholds 24/7."
              metric="99.9%"
              metricLabel="Uptime"
            />
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-zinc-600 text-sm">
          <p>© 2025 TriaGen Systems Inc.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span>Status</span>
            <span>Security</span>
            <span>API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 🎨 Redesigned "System Module" Tile
function FeatureTile({
  icon,
  title,
  subtitle,
  delay,
  metric,
  metricLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  delay: number;
  metric: string;
  metricLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group relative h-64 bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-300"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>

      <div className="relative p-8 h-full flex flex-col justify-between">
        {/* Top Part */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
            {/* Fake Metric Display */}
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                {metric}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                {metricLabel}
              </div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        </div>

        {/* Bottom Part */}
        <p className="text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-4 group-hover:text-zinc-300 transition-colors">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}
