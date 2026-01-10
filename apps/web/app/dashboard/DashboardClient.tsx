/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ShieldAlert,
  Activity,
  Plus,
  Search,
  LogOut,
  CheckCircle2,
  Clock,
  Shield,
  Briefcase,
  AlertTriangle,
  LayoutGrid,
  User,
  Users,
  Filter,
  XCircle,
  Megaphone,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// --- Types ---
enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

enum Status {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;
  createdAt: string;
  reporter?: { id: string; name: string };
  team?: { id: string; name: string };
  assignee?: { id: string; name: string };
  tags?: any;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RESPONDER" | "MEMBER";
  teamId: string;
  team?: { id: string; name: string };
}

const AVAILABLE_TEAMS = [
  "DevOps",
  "Backend Platform",
  "Frontend/UI",
  "SRE (Site Reliability)",
  "Security",
  "Customer Support",
];

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "ALL";

  // Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // 🔍 FILTER STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: Severity.MEDIUM,
    teamName: "DevOps",
    tags: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const SOCKET_URL = "https://triagen.40.192.34.253.sslip.io";

  const socketRef = useRef<Socket | null>(null);

  const handleTabChange = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const safeTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Just now";
      return formatDistanceToNow(date) + " ago";
    } catch {
      return "Just now";
    }
  };

  // 1. INITIAL LOAD & AUTH CHECK
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // 2. FETCH DATA
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/incidents`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { tab: activeTab.toLowerCase() },
        });
        setIncidents(res.data);
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to load incidents. Check Backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [API_URL, activeTab]);

  // 3. SOCKET CONNECTION
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser || socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io/",
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () =>
      console.log("✅ Connected to Command Center Socket:", socket.id)
    );

    // --- EVENT HANDLERS ---

    // 1. Incident Created (Smart Notification Logic)
    socket.on("incident:created", (payload: any) => {
      console.log("🔔 Created:", payload);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      // Don't notify the person who created it
      if (payload.reporterId === currentUser.id) return;

      const targetTeam = payload.team?.name || "General";
      const myTeam = currentUser.team?.name;
      const isForMyTeam = targetTeam === myTeam;

      // 🔥 LOGIC: Urgent alert if it's for MY team
      if (isForMyTeam) {
        toast.error(`ACTION REQUIRED: Incident for ${targetTeam}!`, {
          description: `${payload.severity}: ${payload.title}`,
          icon: <ShieldAlert className="h-6 w-6 text-white" />,
          duration: 8000, // Show longer for urgent
          className: "bg-red-950 border-red-800 text-white font-bold",
        });
      } else {
        // Standard alert for other teams
        toast.message(`New Incident assigned to ${targetTeam}`, {
          description: payload.title,
          icon: <Megaphone className="h-5 w-5 text-blue-400" />,
          duration: 5000,
        });
      }

      setIncidents((prev) => {
        if (prev.find((i) => i.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    });

    // 2. Updated / Assigned
    socket.on("incident:assigned", (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === payload.id ? payload : inc))
      );
    });

    // 3. Updated Status
    socket.on("incident:updated", (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === payload.id ? payload : inc))
      );
    });

    // 4. Deleted
    socket.on("incident:deleted", (payload: any) => {
      console.log("🗑 Incident Deleted:", payload);
      const idToDelete = typeof payload === "string" ? payload : payload.id;
      if (idToDelete) {
        setIncidents((prev) => prev.filter((i) => i.id !== idToDelete));
        toast.info("Incident removed");
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Filtering Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const safeTitle = incident.title ? incident.title.toLowerCase() : "";
      const safeDesc = incident.description
        ? incident.description.toLowerCase()
        : "";
      const q = searchQuery.toLowerCase();

      const matchesSearch = safeTitle.includes(q) || safeDesc.includes(q);
      const matchesStatus =
        statusFilter === "ALL" || incident.status === statusFilter;
      const matchesSeverity =
        severityFilter === "ALL" || incident.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [incidents, searchQuery, statusFilter, severityFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const processedTags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        teamName: formData.teamName,
        tags: processedTags.length > 0 ? processedTags : undefined,
      };

      const res = await axios.post(`${API_URL}/incidents`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIncidents((prev) => {
        const exists = prev.find((i) => i.id === res.data.id);
        if (exists) return prev;
        return [res.data, ...prev];
      });

      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        severity: Severity.MEDIUM,
        teamName: "DevOps",
        tags: "",
      });
      toast.success(`Incident broadcasted to ${formData.teamName}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create incident");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (socketRef.current) socketRef.current.disconnect();
    router.push("/login");
  };

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case Severity.CRITICAL:
        return "bg-red-500 text-white border-red-600 shadow-red-900/40";
      case Severity.HIGH:
        return "bg-orange-500 text-white border-orange-600";
      case Severity.MEDIUM:
        return "bg-yellow-500 text-black border-yellow-600";
      case Severity.LOW:
        return "bg-blue-500 text-white border-blue-600";
      default:
        return "bg-zinc-800 text-zinc-400";
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "RESPONDER":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-blue-500/30">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            TriaGen <span className="text-zinc-500 font-normal">Command</span>
          </div>

          <div className="flex items-center gap-6">
            {user && (
              <div className="hidden md:flex items-center gap-4 bg-zinc-900/50 px-5 py-2 rounded-full border border-zinc-800 backdrop-blur-sm">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-white tracking-tight leading-none">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider flex items-center gap-1 uppercase ${getRoleBadge(user.role)}`}
                    >
                      <Shield className="h-3 w-3" /> {user.role}
                    </span>
                    {user.team?.name ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 uppercase">
                        <Briefcase className="h-3 w-3" /> {user.team.name}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-900/20 text-red-400 border border-red-900/50">
                        NO TEAM
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-1">
          <button
            onClick={() => handleTabChange("ALL")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
              activeTab === "ALL"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> All Incidents
          </button>
          <button
            onClick={() => handleTabChange("MINE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
              activeTab === "MINE"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="h-4 w-4" /> My Incidents
          </button>
          <button
            onClick={() => handleTabChange("TEAM")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
              activeTab === "TEAM"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="h-4 w-4" /> Team Incidents
          </button>
        </div>

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              {activeTab === "ALL"
                ? "Global Feed"
                : activeTab === "MINE"
                  ? "My Assignments"
                  : `${user?.team?.name || "Team"} Feed`}
            </h1>
            <p className="text-zinc-400">
              {filteredIncidents.length} active incidents found.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full sm:w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:ring-2 focus:ring-blue-600 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Severity</option>
                <option value={Severity.CRITICAL}>Critical</option>
                <option value={Severity.HIGH}>High</option>
                <option value={Severity.MEDIUM}>Medium</option>
                <option value={Severity.LOW}>Low</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:ring-2 focus:ring-blue-600 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value={Status.OPEN}>Open</option>
                <option value={Status.ACKNOWLEDGED}>Acknowledged</option>
                <option value={Status.RESOLVED}>Resolved</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="h-24 bg-zinc-900/50 rounded-xl border border-zinc-800"
              ></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 border border-zinc-800 border-dashed rounded-xl">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No incidents found in this view.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setSeverityFilter("ALL");
                    handleTabChange("ALL");
                  }}
                  className="mt-2 text-blue-500 hover:underline text-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <React.Fragment key={incident.id}>
                  <Link
                    href={`/dashboard/${incident.id}`}
                    className="group relative block bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 p-5 rounded-xl transition-all overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${incident.severity === Severity.CRITICAL ? "bg-red-500" : incident.severity === Severity.HIGH ? "bg-orange-500" : incident.severity === Severity.MEDIUM ? "bg-yellow-500" : "bg-blue-500"}`}
                    ></div>
                    <div className="flex justify-between items-start pl-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider shadow-lg ${getSeverityColor(incident.severity)}`}
                          >
                            {incident.severity}
                          </span>
                          <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                            {incident.title || "Untitled Incident"}
                          </h2>
                        </div>
                        <p className="text-zinc-400 text-sm line-clamp-1">
                          {incident.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Briefcase className="h-3 w-3" />
                            <span>
                              To:{" "}
                              <b className="text-zinc-300">
                                {incident.team?.name || "General"}
                              </b>
                            </span>
                          </div>
                          {incident.tags &&
                            Array.isArray(incident.tags) &&
                            incident.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {incident.tags.map(
                                  (tag: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-700"
                                    >
                                      #{tag}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${incident.status === Status.RESOLVED ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" : incident.status === Status.ACKNOWLEDGED ? "text-blue-400 bg-blue-400/10 border-blue-500/20" : "text-zinc-400 bg-zinc-800 border-zinc-700"}`}
                        >
                          {incident.status === Status.RESOLVED ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {incident.status}
                        </div>
                        <p className="text-xs text-zinc-600 font-mono">
                          {safeTimeAgo(incident.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </React.Fragment>
              ))
            )}
          </div>
        )}
      </main>

      {/* Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Report New
              Incident
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Severity
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600"
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        severity: e.target.value as Severity,
                      })
                    }
                  >
                    <option value={Severity.LOW}>Low</option>
                    <option value={Severity.MEDIUM}>Medium</option>
                    <option value={Severity.HIGH}>High</option>
                    <option value={Severity.CRITICAL}>CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Team
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-600"
                    value={formData.teamName}
                    onChange={(e) =>
                      setFormData({ ...formData, teamName: e.target.value })
                    }
                  >
                    {AVAILABLE_TEAMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white h-24 focus:ring-2 focus:ring-blue-600 resize-none"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-3 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold"
                >
                  {submitting ? "Assigning..." : "Broadcast Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
