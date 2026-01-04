"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  AlertTriangle,
  Send,
  Loader2,
  Activity,
  AlertOctagon,
  AlertCircle,
  Info,
  Users, // Added for Team Icon
} from "lucide-react";

// Enum matches Backend exactly
enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// 🏢 Hardcoded Teams (Sync with your Seed file)
const TEAMS = [
  "DevOps",
  "Backend Platform",
  "Frontend/UI",
  "SRE (Site Reliability)",
  "Security",
  "Customer Support",
];

export default function NewIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 📝 Added teamName to state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: Severity.MEDIUM,
    teamName: "DevOps", // Default assignment
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Session Expired", { description: "Please log in again." });
      router.push("/login");
      return;
    }

    try {
      await axios.post(`${API_URL}/incidents`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Incident Broadcasted", {
        description: `Alerted ${formData.teamName} team successfully.`,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Submission Failed", {
        description: "Could not reach the command server.",
      });
      setLoading(false);
    }
  };

  const severityOptions = [
    {
      value: Severity.LOW,
      label: "Low",
      color: "blue",
      icon: Info,
      desc: "Minor UI/UX issues",
    },
    {
      value: Severity.MEDIUM,
      label: "Medium",
      color: "yellow",
      icon: Activity,
      desc: "Performance degradation",
    },
    {
      value: Severity.HIGH,
      label: "High",
      color: "orange",
      icon: AlertCircle,
      desc: "Core feature broken",
    },
    {
      value: Severity.CRITICAL,
      label: "Critical",
      color: "red",
      icon: AlertOctagon,
      desc: "System outage / Data loss",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center text-zinc-400 hover:text-white transition-colors text-sm font-medium gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Command
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-6">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="w-full max-w-3xl relative z-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              Report New Incident
            </h1>
            <p className="text-zinc-400 text-lg">
              Provide details to alert the engineering team.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                Incident Title
              </label>
              <input
                required
                autoFocus
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-lg text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-inner"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g. API Latency Spike in US-East-1"
              />
            </div>

            {/* 🏢 FEATURE #7: OWNING TEAM SELECTOR */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4" /> Assign Response Team
              </label>
              <div className="relative">
                <select
                  value={formData.teamName}
                  onChange={(e) =>
                    setFormData({ ...formData, teamName: e.target.value })
                  }
                  className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all cursor-pointer"
                >
                  {TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <ChevronLeft className="h-4 w-4 -rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                Severity Level
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {severityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = formData.severity === opt.value;
                  let borderClass = "border-zinc-800 hover:border-zinc-700";
                  let bgClass = "bg-zinc-900/30";

                  if (isSelected) {
                    if (opt.color === "red") {
                      borderClass = "border-red-500 ring-1 ring-red-500/50";
                      bgClass = "bg-red-500/10";
                    }
                    if (opt.color === "orange") {
                      borderClass =
                        "border-orange-500 ring-1 ring-orange-500/50";
                      bgClass = "bg-orange-500/10";
                    }
                    if (opt.color === "yellow") {
                      borderClass =
                        "border-yellow-500 ring-1 ring-yellow-500/50";
                      bgClass = "bg-yellow-500/10";
                    }
                    if (opt.color === "blue") {
                      borderClass = "border-blue-500 ring-1 ring-blue-500/50";
                      bgClass = "bg-blue-500/10";
                    }
                  }

                  return (
                    <div
                      key={opt.value}
                      onClick={() =>
                        setFormData({ ...formData, severity: opt.value })
                      }
                      className={`cursor-pointer relative p-4 rounded-xl border ${borderClass} ${bgClass} transition-all duration-200 flex items-start gap-4 group`}
                    >
                      <div
                        className={`mt-1 p-2 rounded-lg ${isSelected ? "bg-black/20" : "bg-zinc-900"} transition-colors`}
                      >
                        <Icon
                          className={`h-5 w-5 ${isSelected ? `text-${opt.color}-500` : "text-zinc-500"}`}
                        />
                      </div>
                      <div>
                        <div
                          className={`font-semibold ${isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                Context & Logs
              </label>
              <textarea
                rows={6}
                required
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Paste relevant error logs, steps to reproduce, or hypothesis here..."
              />
            </div>

            <div className="pt-4 flex gap-4 border-t border-zinc-800/50">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 rounded-lg text-zinc-400 font-medium hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Broadcasting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Broadcast Incident
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
