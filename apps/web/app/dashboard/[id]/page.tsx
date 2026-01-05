/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { format, differenceInSeconds } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  CheckCircle2,
  ChevronLeft,
  Briefcase,
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
} from "lucide-react";

enum Status {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

// ⏱️ SLA Component
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
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(deadline);
      const diff = differenceInSeconds(end, now);
      if (diff <= 0) {
        setIsBreached(true);
        setTimeLeft("BREACHED");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === Status.RESOLVED)
    return (
      <span className="text-emerald-500 font-mono text-xs font-bold flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> SLA MET
      </span>
    );
  if (!deadline) return null;

  return (
    <span
      className={`font-mono text-xs ${isBreached ? "text-red-500" : "text-zinc-400"}`}
    >
      {timeLeft}
    </span>
  );
};

export default function IncidentWarRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Edit State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const socketRef = useRef<Socket | null>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // --- MERGE LOGIC ---
  const timeline = useMemo(() => {
    if (!incident) return [];

    const chatEvents = incident.events.map((e: any) => ({
      ...e,
      kind: "EVENT",
      sortTime: new Date(e.createdAt).getTime(),
    }));

    const fileEvents = incident.attachments.map((a: any) => ({
      ...a,
      kind: "ATTACHMENT",
      sortTime: new Date(a.createdAt).getTime(),
      user: a.uploadedBy || { name: "Unknown", id: "unknown" },
      message: `Uploaded ${a.filename}`,
    }));

    return [...chatEvents, ...fileEvents].sort(
      (a, b) => a.sortTime - b.sortTime
    );
  }, [incident]);

  // Scroll Effect
  useEffect(() => {
    if (timeline.length > 0) {
      if (isInitialLoad) {
        scrollToBottom("auto");
        setIsInitialLoad(false);
      } else {
        scrollToBottom("smooth");
      }
    }
  }, [timeline, isInitialLoad]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
      return;
    }
    if (userStr) setCurrentUser(JSON.parse(userStr));

    axios
      .get(`${API_URL}/incidents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setIncident(res.data);
        setLoading(false);
      })
      .catch(() => router.push("/dashboard"));

    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    const socket = socketRef.current;

    socket.emit("joinRoom", `incident:${id}`);

    // --- LISTENERS ---

    // 1. Handle New Comments
    socket.on("newComment", (event) => {
      setIncident((prev: any) => {
        if (!prev) return prev;

        if (event.type === "DELETED") {
          return {
            ...prev,
            events: prev.events.filter((e: any) => e.id !== event.id),
          };
        }

        if (event.type === "EDITED") {
          return {
            ...prev,
            events: prev.events.map((e: any) =>
              e.id === event.id ? event : e
            ),
          };
        }

        if (prev.events.find((e: any) => e.id === event.id)) return prev;

        let newStatus = prev.status;
        if (event.type === "STATUS_CHANGE") {
          if (event.message.includes("RESOLVED")) newStatus = Status.RESOLVED;
          if (event.message.includes("ACKNOWLEDGED"))
            newStatus = Status.ACKNOWLEDGED;
          if (event.message.includes("OPEN")) newStatus = Status.OPEN;
        }

        return { ...prev, status: newStatus, events: [...prev.events, event] };
      });
    });

    // 2. 🔥 FIX: Handle Message/Event Removal (Real-time Sync)
    socket.on("incident:event_removed", (payload: { id: string }) => {
      setIncident((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          events: prev.events.filter((e: any) => e.id !== payload.id),
        };
      });
    });

    // 3. Handle Updates (Assignee, Severity, etc)
    socket.on("incident:updated", (updatedData: any) => {
      setIncident((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updatedData,
          events: prev.events,
          attachments: prev.attachments,
        };
      });

      if (updatedData.assignee && updatedData.assignee.id !== currentUser?.id) {
        toast.info(`Incident assigned to ${updatedData.assignee.name}`);
      }
    });

    // 4. Handle New Attachments
    socket.on("incident:new_attachment", (attachment) => {
      setIncident((prev: any) => {
        if (!prev) return prev;
        if (prev.attachments.find((a: any) => a.id === attachment.id))
          return prev;

        const patchedAttachment = {
          ...attachment,
          uploadedBy: attachment.uploadedBy || {
            name: "New Upload",
            id: "temp",
          },
        };
        return {
          ...prev,
          attachments: [...prev.attachments, patchedAttachment],
        };
      });
    });

    // 5. Handle Attachment Removal
    socket.on("incident:attachment_removed", (payload) => {
      setIncident((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: prev.attachments.filter((a: any) => a.id !== payload.id),
        };
      });
    });

    // 6. 🔥 FIX: Handle Incident Deletion (Kick User out)
    socket.on("incident:deleted", () => {
      toast.error("This incident has been deleted.");
      router.push("/dashboard");
    });

    return () => {
      socket.disconnect();
    };
  }, [id, API_URL, router, currentUser]); // Added currentUser to dependencies

  // --- ACTIONS ---

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    const token = localStorage.getItem("token");
    const msg = newMessage;
    setNewMessage("");
    await axios.post(
      `${API_URL}/incidents/${id}/comments`,
      { message: msg },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", files[0]);
    const token = localStorage.getItem("token");

    try {
      await axios.post(`${API_URL}/incidents/${id}/attachments`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("File sent");
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
  };

  const handleDeleteIncident = async () => {
    if (
      !confirm(
        "Are you sure? This will delete the incident and all attachments permanently."
      )
    )
      return;
    try {
      await axios.delete(`${API_URL}/incidents/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // No need to redirect manually here, the socket event will handle it for consistency
      // But keeping it for instant local feedback is fine
      toast.success("Incident deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Delete failed. Permission denied.");
    }
  };

  const handleDeleteMessage = async (eventId: string) => {
    if (!confirm("Delete message?")) return;

    // Optimistic Update
    setIncident((prev: any) => ({
      ...prev,
      events: prev.events.filter((e: any) => e.id !== eventId),
    }));

    try {
      await axios.delete(`${API_URL}/incidents/${id}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Message deleted");
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

    setIncident((prev: any) => ({
      ...prev,
      events: prev.events.map((e: any) =>
        e.id === editingEventId ? { ...e, message: editMessageText } : e
      ),
    }));

    const tempId = editingEventId;
    setEditingEventId(null);

    try {
      await axios.put(
        `${API_URL}/incidents/${id}/events/${tempId}`,
        { message: editMessageText },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Message updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Delete this attachment permanently?")) return;

    setIncident((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((a: any) => a.id !== attachmentId),
    }));

    try {
      await axios.delete(
        `${API_URL}/incidents/${id}/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const updateStatus = async (status: Status) => {
    await axios.patch(
      `${API_URL}/incidents/${id}`,
      { status },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
  };

  const handleAssignToMe = async () => {
    try {
      await axios.patch(
        `${API_URL}/incidents/${id}`,
        { assigneeId: currentUser.id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setIncident((prev: any) => ({
        ...prev,
        assignee: currentUser,
        assigneeId: currentUser.id,
      }));
      toast.success("Assigned to you");
    } catch {
      toast.error("Assignment failed");
    }
  };

  const isImage = (filename: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  if (loading || !incident)
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  // 🔒 Logic Constants
  const isResolved = incident.status === Status.RESOLVED;
  const canDeleteIncident =
    currentUser?.role === "ADMIN" ||
    currentUser?.id === incident.reporter?.id ||
    currentUser?.id === incident.reporterId;

  return (
    <div
      className="flex flex-col h-screen bg-black text-zinc-200 font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isResolved) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        if (!isResolved && e.dataTransfer.files) {
          uploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {isDragging && !isResolved && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-blue-200 text-2xl font-bold flex flex-col items-center gap-4 animate-bounce">
            <UploadCloud className="h-16 w-16" /> Drop to Upload Evidence
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 z-20 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-mono">
                #{incident.id.slice(0, 4)}
              </span>
              <h1 className="font-semibold text-white">{incident.title}</h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                  incident.severity === "CRITICAL"
                    ? "bg-red-500/20 text-red-500"
                    : incident.severity === "HIGH"
                      ? "bg-orange-500/20 text-orange-500"
                      : "bg-blue-500/20 text-blue-500"
                }`}
              >
                {incident.severity}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
              <Briefcase className="h-3 w-3" /> {incident.team?.name}
              <span className="text-zinc-700">|</span>
              <SLACountdown
                deadline={incident.slaDeadline}
                status={incident.status}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!incident.assignee && !isResolved && (
            <button
              onClick={handleAssignToMe}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition"
            >
              Assign to Me
            </button>
          )}

          {canDeleteIncident && (
            <button
              onClick={handleDeleteIncident}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition border border-red-500/20"
              title="Delete Incident"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {isResolved ? (
            <div className="px-3 py-1.5 bg-emerald-950 border border-emerald-900 text-emerald-500 rounded-md text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Resolved
            </div>
          ) : (
            <button
              onClick={() => updateStatus(Status.RESOLVED)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Resolve
            </button>
          )}
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col relative bg-black bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            <div className="flex justify-center">
              <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm rounded-lg p-3 max-w-2xl text-center shadow-lg">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                  Initial Report
                </p>
                <p className="text-zinc-300 text-sm">{incident.description}</p>
              </div>
            </div>

            {timeline.map((item: any) => {
              const isMe = currentUser?.id === item.user?.id;

              const isSystem =
                item.kind === "EVENT" &&
                item.type !== "COMMENT" &&
                item.type !== "EDITED";

              if (isSystem) {
                return (
                  <div key={item.id} className="flex justify-center my-4">
                    <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800/50 px-3 py-1 rounded-full text-xs text-zinc-500 flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span className="text-zinc-300 font-bold">
                        {item.user?.name}
                      </span>
                      <span>{item.message}</span>
                      <span className="opacity-50">
                        {format(new Date(item.createdAt), "h:mm a")}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`flex gap-3 group/msg ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-lg ${
                      isMe
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {item.user?.name?.charAt(0).toUpperCase()}
                  </div>

                  <div
                    className={`flex flex-col max-w-[65%] ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-zinc-400">
                        {item.user?.name}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {format(new Date(item.createdAt), "h:mm a")}
                      </span>
                      {item.type === "EDITED" && (
                        <span className="text-[10px] text-zinc-500 italic">
                          (edited)
                        </span>
                      )}
                    </div>

                    {item.kind === "ATTACHMENT" ? (
                      <div className="relative group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 shadow-md">
                        {isImage(item.filename) ? (
                          <div
                            className="cursor-pointer relative"
                            onClick={() =>
                              handleDownload(item.url, item.filename)
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt="attachment"
                              className="max-h-72 object-cover w-full"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-3 p-4 cursor-pointer"
                            onClick={() =>
                              handleDownload(item.url, item.filename)
                            }
                          >
                            <div className="bg-zinc-800 p-2 rounded">
                              <FileText className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-200">
                                {item.filename}
                              </p>
                              <p className="text-xs text-zinc-500">
                                Click to download
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              handleDownload(item.url, item.filename)
                            }
                            className="bg-black/60 p-1.5 rounded text-white hover:bg-black/80"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {/* 🔥 Lock Actions if Resolved */}
                          {!isResolved &&
                            (isMe || currentUser?.role === "ADMIN") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAttachment(item.id);
                                }}
                                className="bg-red-900/80 p-1.5 rounded text-white hover:bg-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/bubble">
                        {editingEventId === item.id ? (
                          <div className="flex flex-col gap-2 bg-zinc-900 border border-zinc-700 p-2 rounded-xl min-w-[250px]">
                            <textarea
                              value={editMessageText}
                              onChange={(e) =>
                                setEditMessageText(e.target.value)
                              }
                              className="bg-zinc-950 p-2 rounded text-sm text-zinc-200 outline-none border border-zinc-800 focus:border-blue-600 w-full"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingEventId(null)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                onClick={saveEdit}
                                className="p-1 text-emerald-500 hover:text-emerald-400"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isMe
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                            }`}
                          >
                            <ReactMarkdown>{item.message}</ReactMarkdown>
                          </div>
                        )}

                        {/* 🔥 Lock Actions if Resolved */}
                        {!editingEventId && isMe && !isResolved && (
                          <div
                            className={`absolute top-0 -right-16 opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-opacity ${isMe ? "right-auto -left-16" : "-right-16"}`}
                          >
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(item.id)}
                              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 🔥 CONDITIONAL INPUT AREA */}
          {isResolved ? (
            <div className="p-4 bg-black border-t border-zinc-800 z-20">
              <div className="max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl flex items-center justify-center gap-3 text-zinc-400">
                <Lock className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium">
                  This incident is resolved. Chat is read-only.
                </span>
                <button
                  onClick={() => updateStatus(Status.OPEN)}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-400 hover:underline text-sm font-medium ml-2"
                >
                  <RotateCcw className="h-3 w-3" /> Reopen
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-black border-t border-zinc-800 z-20">
              <div className="max-w-4xl mx-auto flex items-end gap-3 bg-zinc-900 p-2 rounded-xl border border-zinc-800 focus-within:border-blue-500/50 transition-colors shadow-2xl">
                {/* 🔥 FIX: Connected handleInputFileChange */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleInputFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
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
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm min-h-[24px] max-h-32 py-2 resize-none placeholder-zinc-600"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>

        <aside className="w-72 border-l border-zinc-800 bg-zinc-950 p-6 hidden lg:block z-20">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
            Incident Details
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">ID</span>
              <span className="font-mono text-zinc-300">
                #{incident.id.slice(0, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              <span
                className={
                  incident.status === Status.RESOLVED
                    ? "text-emerald-500 font-bold"
                    : "text-blue-500"
                }
              >
                {incident.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Assignee</span>
              <span className="text-zinc-300">
                {incident.assignee?.name || "Unassigned"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Reporter</span>
              <span className="text-zinc-300">{incident.reporter?.name}</span>
            </div>

            <div className="pt-6 border-t border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                Evidence List
              </h4>
              <div className="space-y-2">
                {incident.attachments.length === 0 && (
                  <p className="text-xs text-zinc-600 italic">No files yet.</p>
                )}
                {incident.attachments.map((a: any) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    className="flex items-center gap-2 p-2 rounded hover:bg-zinc-900 transition text-zinc-400 hover:text-white truncate"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="text-xs truncate">{a.filename}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
