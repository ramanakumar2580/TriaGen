"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// 🔥 Added ArrowLeft here
import {
  Loader2,
  Zap,
  ArrowRight,
  Lock,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🛡️ Fix: Prevent double-toast in Strict Mode
  const hasShownToast = useRef(false);

  // 1️⃣ TOAST #1: Account Created Successfully
  useEffect(() => {
    if (searchParams.get("registered") && !hasShownToast.current) {
      toast.success("Account created successfully", {
        description: "Please sign in with your new credentials.",
        icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
        duration: 5000,
      });
      hasShownToast.current = true;
      router.replace("/login");
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const API_URL = "http://40.192.105.1:4000";

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // 2️⃣ TOAST #2: Welcome to the team
      toast.success("Welcome to the team!", {
        description: "Accessing command center...",
        duration: 2000,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 800);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Login Error:", err);
      const message = err.response?.data?.message || "Invalid credentials.";
      toast.error("Access Denied", {
        description: message,
        icon: <Lock className="h-4 w-4 text-red-500" />,
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans relative">
      {/* 🔥 NEW: Back to Home Button (Top Left) */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden items-center justify-center border-r border-zinc-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-screen" />
        <div className="relative z-10 p-12 max-w-lg">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-900/20 border border-blue-500/20">
            <Zap className="h-7 w-7 text-white fill-white/20" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight text-white">
            Return to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Command.
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed font-light">
            Monitor infrastructure health, manage incidents, and coordinate
            response teams from a single pane of glass.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-black relative">
        <div className="absolute inset-0 lg:hidden opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Welcome Back
            </h2>
            <p className="text-zinc-500 mt-2">
              Please authenticate to access the system.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="admin@triagen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
            >
              Request Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
