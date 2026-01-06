/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { format, differenceInSeconds, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Trash2,
  Download,
  FileText,
  Shield,
  UploadCloud,
  Pencil,
  X,
  Check,
  Lock,
  RotateCcw,
  Clock,
  User,
  Hash,
  AlertTriangle,
} from "lucide-react";

enum Status {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

// ⏱️ SLA Component - Fixed interval and breach logic
const SLACountdown = ({
  deadline,
  status,
}: {
  deadline?: string;
  status: Status;
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    if (!deadline || status === Status.RESOLVED) return;

    const calculate = () => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = differenceInSeconds(end, now);

      if (diff <= 0) {
        setIsBreached(true);
        setTimeLeft("SLA BREACHED");
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = Math.floor(diff % 60);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === Status.RESOLVED) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500 font-mono text-[10px] font-bold">
        <CheckCircle2 className="h-3 w-3" /> SLA MET
      </div>
    );
  }

  if (!deadline) return null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 border rounded font-mono text-[10px] font-bold ${
        isBreached
          ? "bg-red-500/10 border-red-500/20 text-red-500"
          : "bg-zinc-800 border-zinc-700 text-zinc-400"
      }`}
    >
      <Clock className="h-3 w-3" /> {timeLeft}
    </div>
  );
};

export default function IncidentWarRoom() {
  const { id } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // States
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // --- SCROLL LOGIC ---
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  // --- TIMELINE MERGE ---
  const timeline = useMemo(() => {
    if (!incident) return [];
    const chatEvents = (incident.events || []).map((e: any) => ({
      ...e,
      kind: "EVENT",
      sortTime: new Date(e.createdAt).getTime(),
    }));
    const fileEvents = (incident.attachments || []).map((a: any) => ({
      ...a,
      kind: "ATTACHMENT",
      sortTime: new Date(a.createdAt).getTime(),
      user: a.uploadedBy || { name: "System", id: "system" },
      message: `Uploaded ${a.filename}`,
    }));
    return [...chatEvents, ...fileEvents].sort(
      (a, b) => a.sortTime - b.sortTime
    );
  }, [incident]);

  useEffect(() => {
    if (timeline.length > 0) {
      scrollToBottom(isInitialLoad ? "auto" : "smooth");
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [timeline, isInitialLoad]);

  // --- INITIAL DATA & SOCKET ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
      return;
    }
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/incidents/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIncident(res.data);
        setLoading(false);
      } catch {
        toast.error("Failed to load incident");
        router.push("/dashboard");
      }
    };

    fetchData();

    socketRef.current = io(API_URL!, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    const socket = socketRef.current;
    socket.emit("joinRoom", `incident:${id}`);

    socket.on("newComment", (payload) => {
      setIncident((prev: any) => {
        if (!prev) return prev;
        if (payload.type === "DELETED") {
          return {
            ...prev,
            events: prev.events.filter((e: any) => e.id !== payload.id),
          };
        }
        if (payload.type === "EDITED") {
          return {
            ...prev,
            events: prev.events.map((e: any) =>
              e.id === payload.id ? payload : e
            ),
          };
        }
        if (prev.events.some((e: any) => e.id === payload.id)) return prev;
        return { ...prev, events: [...prev.events, payload] };
      });
    });

    socket.on("incident:updated", (data) => {
      setIncident((prev: any) => ({ ...prev, ...data }));
    });

    socket.on("incident:new_attachment", (file) => {
      setIncident((prev: any) => {
        if (!prev || prev.attachments.some((a: any) => a.id === file.id))
          return prev;
        return { ...prev, attachments: [...prev.attachments, file] };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, API_URL, router]);

  // --- ACTIONS ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isUploading) return;
    const token = localStorage.getItem("token");
    const content = newMessage;
    setNewMessage("");

    try {
      await axios.post(
        `${API_URL}/incidents/${id}/comments`,
        { message: content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      toast.error("Message failed to send");
      setNewMessage(content);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      await axios.post(`${API_URL}/incidents/${id}/attachments`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Evidence uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteMessage = async (eventId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API_URL}/incidents/${id}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startEditing = (event: any) => {
    setEditingEventId(event.id);
    setEditMessageText(event.message);
  };

  const saveEdit = async () => {
    if (!editingEventId) return;
    const tempId = editingEventId;
    const text = editMessageText;
    setEditingEventId(null);
    try {
      await axios.put(
        `${API_URL}/incidents/${id}/events/${tempId}`,
        { message: text },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const updateStatus = async (status: Status) => {
    try {
      await axios.patch(
        `${API_URL}/incidents/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.target = "_blank";
    link.click();
  };

  const isImage = (filename: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  if (loading || !incident)
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  const isResolved = incident.status === Status.RESOLVED;

  return (
    <div
      className="flex h-screen bg-[#09090b] text-zinc-300"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isResolved) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        uploadFiles(e.dataTransfer.files);
      }}
    >
      {/* DRAG OVERLAY */}
      {isDragging && !isResolved && (
        <div className="absolute inset-0 z-50 bg-blue-600/10 backdrop-blur-sm border-2 border-blue-500/50 border-dashed m-4 rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-bounce">
            <UploadCloud className="h-12 w-12 text-blue-500" />
            <p className="text-blue-400 font-bold uppercase tracking-tighter">
              Drop Evidence to Upload
            </p>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside className="w-80 border-r border-zinc-800 bg-[#0c0c0e] hidden xl:flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-6"
          >
            <ChevronLeft className="h-4 w-4" />{" "}
            <span className="text-[10px] font-black uppercase tracking-widest">
              Dashboard
            </span>
          </button>
          <h2 className="text-lg font-bold text-white mb-2">
            {incident.title}
          </h2>
          <div className="flex gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${incident.severity === "CRITICAL" ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"}`}
            >
              {incident.severity}
            </span>
            <SLACountdown
              deadline={incident.slaDeadline}
              status={incident.status}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="h-3 w-3" /> Stakeholders
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-500 text-xs font-bold">
                  {incident.reporter?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200">
                    {incident.reporter?.name}
                  </p>
                  <p className="text-[9px] text-zinc-600 uppercase">Reporter</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-bold">
                  {incident.assignee?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200">
                    {incident.assignee?.name || "Unassigned"}
                  </p>
                  <p className="text-[9px] text-zinc-600 uppercase">
                    Lead Engineer
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash className="h-3 w-3" /> Infrastructure
            </h3>
            <div className="text-[11px] space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600">Team</span>
                <span className="text-zinc-400">{incident.team?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Protocol</span>
                <span className="text-zinc-400">WarRoom_v2.4</span>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col relative bg-[#050505]">
        <header className="h-16 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3 xl:hidden">
            <button onClick={() => router.push("/dashboard")}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-bold text-sm text-white truncate max-w-[150px]">
              {incident.title}
            </h1>
          </div>
          <div className="hidden xl:block">
            <span className="text-[10px] font-mono text-zinc-600">
              WAR_ROOM_SESSION_ID: {incident.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isResolved ? (
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded text-[10px] font-black uppercase flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" /> Resolved
              </div>
            ) : (
              <button
                onClick={() => updateStatus(Status.RESOLVED)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-[10px] font-black uppercase transition shadow-lg shadow-blue-600/20"
              >
                Mark Resolved
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(#1c1c1f_1px,transparent_1px)] [background-size:32px_32px]">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 relative">
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">
                <AlertTriangle className="h-3 w-3" /> Initial Briefing
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {incident.description}
              </p>
            </div>

            {timeline.map((item: any) => {
              const isMe = currentUser?.id === item.user?.id;
              const isSystem =
                item.kind === "EVENT" &&
                item.type !== "COMMENT" &&
                item.type !== "EDITED";

              if (isSystem)
                return (
                  <div key={item.id} className="flex justify-center">
                    <div className="px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-500 flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-500" />{" "}
                      <span className="text-zinc-300">{item.user?.name}</span>{" "}
                      {item.message}
                    </div>
                  </div>
                );

              return (
                <div
                  key={item.id}
                  className={`flex gap-4 group ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-xl ${isMe ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    {item.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                      <span>{item.user?.name}</span> <span>•</span>{" "}
                      <span>
                        {format(new Date(item.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                    {item.kind === "ATTACHMENT" ? (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden group/file relative shadow-2xl">
                        {isImage(item.filename) ? (
                          <img
                            src={item.url}
                            alt="att"
                            className="max-h-72 object-contain bg-black/40 cursor-zoom-in"
                            onClick={() => window.open(item.url, "_blank")}
                          />
                        ) : (
                          <div className="p-4 flex items-center gap-4">
                            <div className="h-10 w-10 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-200">
                                {item.filename}
                              </p>
                              <p className="text-[9px] text-zinc-600 font-mono">
                                ENCRYPTED_BLOB
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() =>
                              handleDownload(item.url, item.filename)
                            }
                            className="p-2 bg-white text-black rounded-full hover:scale-110 transition"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/bubble">
                        <div
                          className={`px-5 py-3 rounded-2xl text-[13px] leading-relaxed shadow-lg border ${isMe ? "bg-blue-600 border-blue-500 text-white rounded-tr-none" : "bg-[#18181b] border-zinc-800 text-zinc-200 rounded-tl-none"}`}
                        >
                          {editingEventId === item.id ? (
                            <div className="flex flex-col gap-2 min-w-[250px]">
                              <textarea
                                value={editMessageText}
                                onChange={(e) =>
                                  setEditMessageText(e.target.value)
                                }
                                className="bg-black/20 rounded p-2 text-sm outline-none border border-white/20 resize-none h-20"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingEventId(null)}
                                  className="p-1"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={saveEdit}
                                  className="p-1 text-emerald-400"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown>{item.message}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {isMe && !isResolved && !editingEventId && (
                          <div
                            className={`absolute top-0 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity ${isMe ? "right-full mr-2" : "left-full ml-2"}`}
                          >
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1.5 text-zinc-600 hover:text-white"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(item.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        {/* INPUT BAR */}
        <footer className="p-4 lg:p-6 bg-[#09090b] border-t border-zinc-800 shrink-0">
          <div className="max-w-3xl mx-auto">
            {isResolved ? (
              <div className="flex flex-col items-center gap-2 py-6 border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/20">
                <Lock className="h-5 w-5 text-zinc-700" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Protocol Terminated - War Room Closed
                </p>
                <button
                  onClick={() => updateStatus(Status.OPEN)}
                  className="text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reopen Incident
                </button>
              </div>
            ) : (
              <div className="relative group bg-[#0c0c0e] border border-zinc-800 rounded-2xl p-2 focus-within:border-zinc-600 transition shadow-2xl">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => uploadFiles(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-zinc-500 hover:text-white transition rounded-xl hover:bg-zinc-800"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type updates or share evidence..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm py-3 resize-none max-h-48 scrollbar-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isUploading}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-30 transition shadow-lg shadow-blue-600/20"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between px-2 text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
              <div className="flex gap-4">
                <span>Socket: Active</span> <span>Encryption: AES-256</span>
              </div>
              <span>Markdown Enabled</span>
            </div>
          </div>
        </footer>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-80 border-l border-zinc-800 bg-[#0c0c0e] hidden 2xl:flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
            Evidence Vault
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex flex-col items-center">
              <p className="text-xl font-bold text-white">
                {incident.attachments?.length || 0}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase font-bold">
                Files
              </p>
            </div>
            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex flex-col items-center">
              <p className="text-xl font-bold text-white">
                {incident.events?.filter((e: any) => e.type === "COMMENT")
                  .length || 0}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase font-bold">
                Log Entries
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {incident.attachments?.map((file: any) => (
            <div
              key={file.id}
              className="group p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition cursor-pointer"
              onClick={() => handleDownload(file.url, file.filename)}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-zinc-600 group-hover:text-blue-500 transition" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-zinc-400 truncate group-hover:text-white">
                    {file.filename}
                  </p>
                  <p className="text-[9px] text-zinc-700 font-mono">
                    {formatDistanceToNow(new Date(file.createdAt))} ago
                  </p>
                </div>
              </div>
            </div>
          ))}
          {incident.attachments?.length === 0 && (
            <p className="text-center text-[10px] text-zinc-700 py-10 uppercase font-bold tracking-widest">
              No evidence stored
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
