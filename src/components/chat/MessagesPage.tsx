import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Image as ImageIcon,
  Paperclip,
  Send,
  Sparkles,
  User2,
  AlertOctagon,
  Mic,
  Play,
  X,
  ChevronRight,
  Loader2,
  Upload,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import { useAI } from "@/hooks/useAI";
import { mockCustomers, type Customer } from "@/data/mockCustomers";
import { mockProducts } from "@/data/mockProducts";
import { mockMeetings } from "@/data/mockMeetings";
import { formatChatForAI, buildContextBlock } from "@/utils/formatChat";
import type { Order } from "@/data/mockOrders";
import type { Meeting } from "@/data/mockMeetings";
import { readActionFile, setActionItemStatus } from "@/server/actionFiles.functions";
import { parseWhatsAppExport } from "@/utils/parseWhatsAppExport";
import { Badge } from "@/components/shared/Badge";
import { Modal, toast } from "@/components/shared/Toast";
import { cn } from "@/lib/utils";
import { playPing } from "@/hooks/useSound";
import {
  persistConfirmedOrder,
  persistConfirmedMeeting,
} from "@/server/action.functions";
import { saveLocalChatHistory } from "@/server/chatFiles.functions";
import { getLocalChatAnalysis, saveLocalChatAnalysis } from "@/server/chatAnalysis.functions";

type AIChatMsg = { role: "user" | "assistant"; content: string };

function makeFallbackCustomer(chat: {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerAvatarColor?: string;
  customerInitials?: string;
  lastMessagePreview: string;
}): Customer {
  return {
    id: chat.customerId,
    name: chat.customerName || "Imported Contact",
    phone: chat.customerPhone || "Unknown",
    avatarColor: chat.customerAvatarColor || "#2563eb",
    initials: chat.customerInitials || "IC",
    loyalSince: "Imported",
    totalOrders: 0,
    totalSpent: 0,
    lastActive: "Today",
    status: "Active",
    preferredProducts: [],
    avgOrderValue: 0,
    behaviorSummary:
      "This customer was imported from a WhatsApp export. Profile enrichment will improve after more interactions.",
    orderHistory: [],
    lastConversationExcerpt: chat.lastMessagePreview,
  };
}

export function MessagesPage() {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    sendAgentMessage,
    markChatRead,
    importWhatsAppChat,
    createOrder,
    createMeeting,
    settings,
    addNotification,
  } = useApp();
  const { analyze, chatWithAI, generateOrdersMeetings, loading: aiLoading, error: aiError } = useAI();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "chat" | "actions">("analysis");
  const [analyses, setAnalyses] = useState<Record<string, string | null>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [planning, setPlanning] = useState(false);

  const [actionOrders, setActionOrders] = useState<Order[]>([]);
  const [actionMeetings, setActionMeetings] = useState<Meeting[]>([]);

  const [aiChats, setAiChats] = useState<Record<string, AIChatMsg[]>>({});
  const [aiInput, setAiInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [customerNameOverride, setCustomerNameOverride] = useState("");
  const [whatsAppUserName, setWhatsAppUserName] = useState("");
  const [agentNamesInput, setAgentNamesInput] = useState("You, Me, Agent");
  const [importing, setImporting] = useState(false);
  const [showAnalysisBanner, setShowAnalysisBanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analysisBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Simulate one new message arriving 30s after load (Nurul Hana)
  useEffect(() => {
    const timer = setTimeout(() => {
      // We can't push directly into chats here (immutable mock), but we send an agent-style notification + ping
      if (settings.soundOnNewMessage) playPing();
      addNotification({
        severity: "info",
        text: "New message from Nurul Hana",
        link: { type: "chat", id: "c4" },
      });
      toast("New message from Nurul Hana", "info");
    }, 30000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, []);

  // Mark active chat as read
  useEffect(() => {
    if (activeChatId) markChatRead(activeChatId);
    // eslint-disable-next-line
  }, [activeChatId]);

  const customersById = useMemo(() => {
    const map = new Map<string, Customer>(mockCustomers.map((c) => [c.id, c]));
    for (const c of chats) {
      if (!map.has(c.customerId)) {
        map.set(c.customerId, makeFallbackCustomer(c));
      }
    }
    return map;
  }, [chats]);

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      const cust = customersById.get(c.customerId);
      if (!cust) return false;
      return cust.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [chats, customersById, search]);

  const activeChat = chats.find((c) => c.customerId === activeChatId);
  const activeCustomer = activeChatId ? customersById.get(activeChatId) : undefined;
  const activeAnalysis = activeChatId ? analyses[activeChatId] : null;
  const activeAiChat = activeChatId ? aiChats[activeChatId] || [] : [];
  const hasActiveChat = Boolean(activeChat && activeCustomer);

  const handleImportChat = async () => {
    if (!importText.trim()) {
      toast("Paste WhatsApp exported text or upload a .txt file first.", "error");
      return;
    }

    setImporting(true);
    try {
      const parsed = parseWhatsAppExport(importText, {
        customerNameOverride: customerNameOverride.trim() || undefined,
        agentNames: [
          ...new Set(
            agentNamesInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .concat(whatsAppUserName.trim() ? [whatsAppUserName.trim()] : []),
          ),
        ],
      });

      const result = await importWhatsAppChat(parsed);
      const agentNames = [
        ...new Set(
          agentNamesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .concat(whatsAppUserName.trim() ? [whatsAppUserName.trim()] : []),
        ),
      ];
      const saveResult = await saveLocalChatHistory({
        data: {
          customerName: parsed.customerName,
          rawText: importText,
          agentNames: agentNames.length ? agentNames : undefined,
        },
      });
      if (!saveResult.ok) {
        toast("Imported chat, but failed to save to local history folder.", "info");
      }
      setImportOpen(false);
      setImportText("");
      setCustomerNameOverride("");
      setWhatsAppUserName("");
      toast(`Imported chat for ${parsed.customerName}`, "success");
      setActiveChatId(result.customerId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import chat";
      toast(message, "error");
    } finally {
      setImporting(false);
    }
  };

  const onUploadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      toast("WhatsApp export loaded. Review and import.", "success");
    } catch {
      toast("Could not read file.", "error");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, activeChat?.messages.length]);

  useEffect(() => {
    return () => {
      if (analysisBannerTimerRef.current) {
        clearTimeout(analysisBannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeChatId || !activeCustomer) return;
    if (analyses[activeChatId]) return;

    let cancelled = false;
    const loadAnalysis = async () => {
      const result = await getLocalChatAnalysis({
        data: { customerName: activeCustomer.name },
      });
      if (cancelled || !result.ok || !result.content) return;
      setAnalyses((prev) => ({ ...prev, [activeChatId]: result.content }));
    };

    void loadAnalysis();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, activeCustomer, analyses]);

  const loadActions = async () => {
    if (!activeCustomer) return;
    const res = await readActionFile({ data: activeCustomer.name });
    if (res.ok) {
      setActionOrders(res.orders || []);
      setActionMeetings(res.meetings || []);
    }
  };

  useEffect(() => {
    void loadActions();
  }, [activeCustomer]);

  const productCatalogStr = mockProducts
    .map(
      (p) => `${p.name} (${p.sku}) RM${p.price} — stock ${p.stock === -1 ? "unlimited" : p.stock}`,
    )
    .join("; ");
  const meetingsStr = mockMeetings
    .map((m) => `${m.date} ${m.time} ${m.customerName} — ${m.purpose} [${m.status}]`)
    .join("; ");
  const ctxBlock = buildContextBlock({
    productCatalog: productCatalogStr,
    meetingsToday: meetingsStr,
  });

  const generateActionPlan = async () => {
    if (!activeChat || !activeChatId || !activeCustomer) return;
    setPlanning(true);
    const result = await generateOrdersMeetings(activeCustomer.name);
    setPlanning(false);
    if (result.ok && result.filePath) {
      toast(`Actions saved to ${result.filePath}`, "success");
      void loadActions();
    } else if (result.error) {
      toast(result.error, "error");
    }
  };

  const runAnalysis = async () => {
    if (!activeChat || !activeChatId) return;
    setShowAnalysisBanner(true);
    setAnalyzing(true);
    if (analysisBannerTimerRef.current) {
      clearTimeout(analysisBannerTimerRef.current);
    }
    analysisBannerTimerRef.current = setTimeout(() => setShowAnalysisBanner(false), 5000);
    const formatted = formatChatForAI(activeChat.messages, activeCustomer);
    const result = await analyze(formatted, ctxBlock, activeChatId);
    setAnalyzing(false);
    if (result) {
      setAnalyses((prev) => ({ ...prev, [activeChatId]: result }));
      if (activeCustomer) {
        const saveResult = await saveLocalChatAnalysis({
          data: { customerName: activeCustomer.name, analysisText: result },
        });
        if (!saveResult.ok) {
          toast("AI analysis saved locally failed.", "info");
        }
      }
      toast("AI analysis complete", "success");
    } else if (aiError) {
      toast(aiError, "error");
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !activeChatId) return;
    sendAgentMessage(activeChatId, chatInput.trim());
    setChatInput("");
    toast("Message sent", "success");
  };

  const askAI = async () => {
    if (!aiInput.trim() || !activeChatId || !activeChat) return;
    const userMsg: AIChatMsg = { role: "user", content: aiInput.trim() };
    const newHistory = [...activeAiChat, userMsg];
    setAiChats((prev) => ({ ...prev, [activeChatId]: newHistory }));
    setAiInput("");
    const convoCtx = formatChatForAI(activeChat.messages, activeCustomer);
    const fullCtx = `${ctxBlock}\n\n${convoCtx}`;
    const reply = await chatWithAI(newHistory, fullCtx);
    if (reply) {
      setAiChats((prev) => ({
        ...prev,
        [activeChatId]: [...newHistory, { role: "assistant", content: reply }],
      }));
    } else if (aiError) {
      toast(aiError, "error");
    }
  };

  return (
    <div className="h-full flex">
      {/* Inbox List */}
      <div className="w-65 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-9 pl-8 pr-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setImportOpen(true)}
            className="mt-2 w-full h-9 rounded-md border border-border text-xs font-semibold hover:bg-accent inline-flex items-center justify-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Import WhatsApp Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((c) => {
            const cust = customersById.get(c.customerId) || makeFallbackCustomer(c);
            const isActive = c.customerId === activeChatId;
            return (
              <button
                key={c.customerId}
                onClick={() => setActiveChatId(c.customerId)}
                className={cn(
                  "w-full text-left p-3 border-b border-border hover:bg-accent/50 transition-colors flex gap-3 relative",
                  isActive && "bg-primary-soft",
                  c.flagged === "critical" && "animate-pulse-flag",
                )}
              >
                {c.flagged && (
                  <span
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-0.75",
                      c.flagged === "critical" ? "bg-destructive" : "bg-warning",
                    )}
                  />
                )}
                <div
                  className="h-10 w-10 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                  style={{ background: cust.avatarColor }}
                >
                  {cust.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {cust.name}
                    </span>
                    {c.unread > 0 && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.lastMessagePreview}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {c.status === "resolved" && <Badge variant="success">Resolved</Badge>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <div className="h-14 border-b border-border bg-card px-4 flex items-center gap-3 shrink-0">
          {activeChat && activeCustomer ? (
            <>
              <div
                className="h-9 w-9 rounded-full text-white font-bold text-xs flex items-center justify-center"
                style={{ background: activeCustomer.avatarColor }}
              >
                {activeCustomer.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{activeCustomer.name}</div>
                <div className="text-xs text-muted-foreground">{activeCustomer.phone}</div>
              </div>
              <button
                onClick={() => setProfileOpen(true)}
                className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent flex items-center gap-1.5"
              >
                <User2 className="h-3.5 w-3.5" /> View Profile
              </button>
              <button
                onClick={() => setEscalateOpen(true)}
                className="h-8 px-3 rounded-md border border-destructive/50 text-destructive text-xs font-medium hover:bg-destructive/5 flex items-center gap-1.5"
              >
                <AlertOctagon className="h-3.5 w-3.5" /> Escalate
              </button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No chats yet. Import a chat to begin.</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeChat ? (
            activeChat.messages.map((m) => {
              const isAgent = m.side ? m.side === "right" : m.from === "agent";
              return (
                <div key={m.id} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[65%] rounded-2xl px-3.5 py-2",
                      isAgent
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md",
                    )}
                  >
                    {m.type === "text" && (
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">{m.text}</p>
                    )}
                    {m.type === "image" && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-xs">{m.filename}</span>
                      </div>
                    )}
                    {m.type === "voice" && (
                      <div className="flex items-center gap-2 py-1 min-w-35">
                        <button className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex-1 flex items-center gap-0.5">
                          {[3, 5, 7, 4, 6, 8, 5, 3, 5, 7, 4, 6, 3].map((h, i) => (
                            <span
                              key={i}
                              className="w-0.5 rounded-full bg-current opacity-60"
                              style={{ height: `${h * 1.5}px` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px]">{m.duration}</span>
                        <Mic className="h-3 w-3 opacity-60" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "text-[10px] mt-1 opacity-70",
                        isAgent ? "text-right" : "text-left",
                      )}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No conversations yet. Import a chat to get started.
            </div>
          )}
          {showAnalysisBanner && (
            <div className="flex justify-center">
              <div className="text-[11px] text-muted-foreground bg-primary-soft px-3 py-1 rounded-full inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                AI is analyzing this conversation
                <span className="inline-flex gap-0.5">
                  <span className="dot-1">.</span>
                  <span className="dot-2">.</span>
                  <span className="dot-3">.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card p-3 shrink-0">
          <div className="flex items-end gap-2">
            <button
              onClick={() => toast("File attached (UI demo)", "info")}
              disabled={!hasActiveChat}
              className="h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => toast("Image attached (UI demo)", "info")}
              disabled={!hasActiveChat}
              className="h-9 w-9 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!hasActiveChat}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={hasActiveChat ? "Type a reply..." : "Select a chat to reply"}
              className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!hasActiveChat || !chatInput.trim()}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" /> Send
            </button>
            <button
              onClick={() => {
                setActiveTab("analysis");
                runAnalysis();
              }}
              disabled={!hasActiveChat}
              className="h-10 px-4 rounded-md bg-primary-soft text-primary-dark dark:text-accent-foreground text-sm font-semibold hover:bg-primary/15 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> Ask AI
            </button>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      <div className="w-95 border-l border-border bg-card flex flex-col shrink-0">
        <div className="border-b border-border flex items-center px-3 shrink-0">
          {(["analysis", "actions", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-12 px-4 text-sm font-semibold border-b-2 transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "analysis" ? "AI Analysis" : tab === "actions" ? "AI Actions" : "Chat with AI"}
            </button>
          ))}
          {(analyzing || planning || aiLoading) && (
            <Loader2 className="h-3.5 w-3.5 ml-auto text-primary animate-spin" />
          )}
        </div>

        {!hasActiveChat ? (
          <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground">
            Import a chat to enable AI features.
          </div>
        ) : activeTab === "analysis" ? (
          <AnalysisTab analysis={activeAnalysis} onRun={runAnalysis} loading={analyzing} />
        ) : activeTab === "actions" ? (
          <ActionsTab
            loading={planning}
            onGenerate={generateActionPlan}
            orders={actionOrders}
            meetings={actionMeetings}
            onApproveOrder={(o) => {
              createOrder({
                customerId: activeCustomer?.id || "unknown",
                customerName: activeCustomer?.name || "Unknown",
                items: o.items,
                total: o.total,
                chatExcerpt: o.chatExcerpt,
              });
              setActionOrders((prev) => prev.filter((x) => x.id !== o.id));
              void setActionItemStatus({ data: { customerName: activeCustomer?.name || "Unknown", itemId: o.id, status: "approved" } });
              toast(`Approved order`, "success");
            }}
            onApproveMeeting={(m) => {
              createMeeting({
                customerId: activeCustomer?.id || "unknown",
                customerName: activeCustomer?.name || "Unknown",
                date: m.date,
                time: m.time,
                duration: m.duration,
                purpose: m.purpose,
              });
              setActionMeetings((prev) => prev.filter((x) => x.id !== m.id));
              void setActionItemStatus({ data: { customerName: activeCustomer?.name || "Unknown", itemId: m.id, status: "approved" } });
              toast(`Approved meeting`, "success");
            }}
            onRejectOrder={(o) => {
              setActionOrders((prev) => prev.filter((x) => x.id !== o.id));
              void setActionItemStatus({ data: { customerName: activeCustomer?.name || "Unknown", itemId: o.id, status: "rejected" } });
            }}
            onRejectMeeting={(m) => {
              setActionMeetings((prev) => prev.filter((x) => x.id !== m.id));
              void setActionItemStatus({ data: { customerName: activeCustomer?.name || "Unknown", itemId: m.id, status: "rejected" } });
            }}
          />
        ) : (
          <AiChatTab
            history={activeAiChat}
            input={aiInput}
            onInput={setAiInput}
            onSend={askAI}
            loading={aiLoading}
            onSuggest={(t) => setAiInput(t)}
          />
        )}
      </div>

      <Modal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        title="Escalate Conversation"
        footer={
          <>
            <button
              onClick={() => setEscalateOpen(false)}
              className="h-9 px-4 rounded-md border border-border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setEscalateOpen(false);
                toast("Chat escalated to Ahmad Z.", "success");
              }}
              className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold"
            >
              Escalate Now
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Escalate to</label>
            <select className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
              <option>Ahmad Z. (Senior Agent)</option>
              <option>Priya R. (Agent)</option>
              <option>Supervisor</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Reason for escalation</label>
            <textarea
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              placeholder="Customer is requesting bulk discount that needs senior approval..."
            />
          </div>
        </div>
      </Modal>

      {activeCustomer && (
        <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Customer Profile">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full text-white font-bold flex items-center justify-center"
                style={{ background: activeCustomer.avatarColor }}
              >
                {activeCustomer.initials}
              </div>
              <div>
                <div className="font-semibold text-foreground">{activeCustomer.name}</div>
                <div className="text-xs text-muted-foreground">
                  {activeCustomer.phone} · Loyal since {activeCustomer.loyalSince}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-secondary rounded-md">
                <div className="text-lg font-bold text-foreground">{activeCustomer.totalOrders}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Orders</div>
              </div>
              <div className="p-2 bg-secondary rounded-md">
                <div className="text-lg font-bold text-foreground">RM{activeCustomer.totalSpent}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Lifetime</div>
              </div>
              <div className="p-2 bg-secondary rounded-md">
                <div className="text-lg font-bold text-foreground">
                  RM{activeCustomer.avgOrderValue}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Avg Order</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground mb-1">AI behavior summary</div>
              <p className="text-xs text-muted-foreground">{activeCustomer.behaviorSummary}</p>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import WhatsApp Export"
        footer={
          <>
            <button
              onClick={() => setImportOpen(false)}
              className="h-9 px-4 rounded-md border border-border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleImportChat}
              disabled={importing}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import Chat"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Upload .txt export</label>
            <div className="mt-1 flex gap-2">
              <input
                ref={importFileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => void onUploadFile(e.target.files?.[0])}
              />
              <button
                onClick={() => importFileRef.current?.click()}
                className="h-9 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent"
              >
                Choose File
              </button>
              <span className="text-[11px] text-muted-foreground self-center">
                WhatsApp exported chat file
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Customer name (optional)</label>
            <input
              value={customerNameOverride}
              onChange={(e) => setCustomerNameOverride(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              placeholder="Override inferred contact name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Your WhatsApp name (optional)
            </label>
            <input
              value={whatsAppUserName}
              onChange={(e) => setWhatsAppUserName(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              placeholder="The name that appears on your messages"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Agent names (comma separated)
            </label>
            <input
              value={agentNamesInput}
              onChange={(e) => setAgentNamesInput(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              placeholder="You, Me, Agent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Paste WhatsApp export text
            </label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-xs font-mono"
              placeholder="Paste exported chat content here"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AnalysisTab({
  analysis,
  onRun,
  loading,
}: {
  analysis: string | null;
  onRun: () => void;
  loading: boolean;
}) {
  if (!analysis && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="h-8 w-8 text-primary mb-3" />
        <h4 className="font-semibold text-foreground">No analysis yet</h4>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Run AI to extract the business-relevant items from this conversation.
        </p>
        <button
          onClick={onRun}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          Run AI Analysis
        </button>
      </div>
    );
  }
  if (loading && !analysis) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Analyzing conversation...
      </div>
    );
  }
  if (!analysis) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <Section title="Analysis Results">
        <div className="text-xs bg-secondary p-3 rounded-md text-foreground whitespace-pre-wrap">
          {analysis}
        </div>
        <div className="mt-2">
          <button
            onClick={onRun}
            className="h-8 px-3 rounded-md border border-border text-xs font-semibold hover:bg-accent"
          >
            Regenerate
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h5>
      {children}
    </div>
  );
}

function AiChatTab({
  history,
  input,
  onInput,
  onSend,
  loading,
  onSuggest,
}: {
  history: AIChatMsg[];
  input: string;
  onInput: (s: string) => void;
  onSend: () => void;
  loading: boolean;
  onSuggest: (s: string) => void;
}) {
  const SUGGESTIONS = [
    "What is the customer's history?",
    "Is there a schedule conflict for Friday?",
    "How should I handle this complaint?",
  ];
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="h-7 w-7 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Ask AI follow-up questions about this conversation.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggest(s)}
                  className="w-full text-left text-xs p-2 border border-border rounded-md hover:bg-accent flex items-center justify-between gap-2"
                >
                  <span>{s}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> AI is thinking...
          </div>
        )}
      </div>
      <div className="border-t border-border p-2 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask AI anything about this conversation..."
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || loading}
          className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ActionsTab({
  loading,
  onGenerate,
  orders,
  meetings,
  onApproveOrder,
  onRejectOrder,
  onApproveMeeting,
  onRejectMeeting,
}: {
  loading: boolean;
  onGenerate: () => void;
  orders: Order[];
  meetings: Meeting[];
  onApproveOrder: (o: Order) => void;
  onRejectOrder: (o: Order) => void;
  onApproveMeeting: (m: Meeting) => void;
  onRejectMeeting: (m: Meeting) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-background">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Proposed Actions
        </h4>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Regenerate
        </button>
      </div>

      {orders.length === 0 && meetings.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground text-center py-10">
          No actions found. Generate some from the chat!
        </div>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="primary">Order</Badge>
              <span className="text-xs text-muted-foreground font-mono">{o.id}</span>
            </div>
            <div className="text-sm font-semibold mb-1">{o.items}</div>
            <div className="text-xs text-muted-foreground mb-3">Total: RM {o.total}</div>
            <div className="flex gap-2">
              <button onClick={() => onRejectOrder(o)} className="flex-1 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent text-destructive">Reject</button>
              <button onClick={() => onApproveOrder(o)} className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Approve</button>
            </div>
          </div>
        ))}

        {meetings.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="warning">Meeting</Badge>
              <span className="text-xs text-muted-foreground font-mono">{m.id}</span>
            </div>
            <div className="text-sm font-semibold mb-1">{m.purpose}</div>
            <div className="text-xs text-muted-foreground mb-3">{m.date} at {m.time} ({m.duration})</div>
            <div className="flex gap-2">
              <button onClick={() => onRejectMeeting(m)} className="flex-1 h-8 rounded-md border border-border text-xs font-semibold hover:bg-accent text-destructive">Reject</button>
              <button onClick={() => onApproveMeeting(m)} className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Approve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
