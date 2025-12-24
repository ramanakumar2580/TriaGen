"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// 🔥 Added ArrowLeft here
import {
  Loader2,
  Zap,
  ArrowRight,
  Shield,
  Users,
  ArrowLeft,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // 📝 State for "God Mode" Features
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER", // Default
    teamName: "DevOps", // Default
  });

  const [loading, setLoading] = useState(false);

  // 🏢 Hardcoded Teams (Must match your Seed file)
  const teams = [
    "DevOps",
    "Backend Platform",
    "Frontend/UI",
    "SRE (Site Reliability)",
    "Security",
    "Customer Support",
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // ⚡ FIX: Hardcoded to Port 4000 to match your Backend
    const API_URL = "http://localhost:4000";

    try {
      // 🚀 Sending full payload including Role & Team
      await axios.post(`${API_URL}/auth/register`, formData);

      toast.success("Welcome to the team!", {
        description: "Account created. Please log in.",
      });

      router.push("/login?registered=true");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // detailed error logging
      console.error("Signup Error:", err);

      const message =
        err.response?.data?.message ||
        "Registration failed. Check backend connection.";
      toast.error("Access Denied", { description: message });
    } finally {
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

      {/* LEFT SIDE: Brand Visuals */}
      <div className="hidden lg:flex w-1/2 relative bg-zinc-900 overflow-hidden items-center justify-center border-r border-zinc-800">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl mix-blend-screen" />

        <div className="relative z-10 p-12 max-w-lg">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-900/20 border border-blue-500/20">
            <Zap className="h-7 w-7 text-white fill-white/20" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight text-white">
            Join the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Response Team.
            </span>
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed font-light">
            Create your TriaGen account to start managing critical incidents,
            automating escalations, and protecting your uptime in real-time.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-black relative">
        {/* Mobile Background Grid */}
        <div className="absolute inset-0 lg:hidden opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Create Account
            </h2>
            <p className="text-zinc-500 mt-2">
              Enter your credentials to access the command center.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="Ex. Sarah Connor"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 🛡️ Role Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Shield className="h-3 w-3" /> Role
                </label>
                <div className="relative">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="RESPONDER">Responder</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {/* Custom Arrow */}
                  <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 🏢 Team Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <Users className="h-3 w-3" /> Team
                </label>
                <div className="relative">
                  <select
                    name="teamName"
                    value={formData.teamName}
                    onChange={handleChange}
                    className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  {/* Custom Arrow */}
                  <div className="absolute right-3 top-3.5 pointer-events-none text-zinc-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.6)]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Initializing...
                </>
              ) : (
                <>
                  Deploy Account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
