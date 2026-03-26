import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { createClient } from "@supabase/supabase-js";

const authClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];
const STATUS_META = {
  "Pending":     { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
  "In Progress": { color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)"  },
  "Completed":   { color: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
};
const MAKES = ["Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jeep","Kia","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0D1117; color: #E6EDF3; font-family: 'Rajdhani', system-ui, sans-serif; font-size: 15px; line-height: 1.5; min-height: 100vh; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #30363D; border-radius: 3px; }
  input, select, textarea { background: #0D1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #E6EDF3; font-family: 'Rajdhani', sans-serif; font-size: 15px; padding: 8px 12px; width: 100%; outline: none; transition: border-color .15s, box-shadow .15s; }
  input:focus, select:focus, textarea:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
  select option { background: #1C2333; }
  textarea { resize: none; }
  .mono { font-family: 'JetBrains Mono', monospace !important; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
  .slide-in { animation: slideIn .22s ease forwards; }
  .pop-in   { animation: popIn  .18s ease forwards; }
  @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } .kanban-grid { grid-template-columns: 1fr !important; } .modal-grid { grid-template-columns: 1fr !important; } .mechanic-grid { grid-template-columns: 1fr !important; } .msg-layout { flex-direction: column !important; } .msg-sidebar { width: 100% !important; max-height: 220px !important; } }
  @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } .hide-mobile { display: none !important; } .page-pad { padding: 16px 14px !important; } }
`;

const todayStr = () => new Date().toISOString();
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 32 }, (_, i) => currentYear + 1 - i);
function getInitials(name = "") { return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════════

function Spinner({ size = 20 }) {
  return <div style={{ width: size, height: size, border: "2px solid rgba(245,158,11,0.2)", borderTop: "2px solid #F59E0B", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block", flexShrink: 0 }} />;
}
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META["Pending"];
  return <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: 20, padding: "3px 11px", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", whiteSpace: "nowrap", fontFamily: "'Rajdhani', sans-serif" }}>{status}</span>;
}
function Avatar({ name = "", size = 36 }) {
  const initials = getInitials(name);
  const palette = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"];
  const col = palette[(name.charCodeAt(0) || 0) % palette.length];
  return <div style={{ width: size, height: size, borderRadius: "50%", background: col + "22", border: `1.5px solid ${col}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * .36), fontWeight: 700, color: col, flexShrink: 0, letterSpacing: "0.05em", userSelect: "none" }}>{initials}</div>;
}
function Btn({ children, variant = "ghost", onClick, disabled, style: sx = {} }) {
  const variants = {
    primary: { background: "#F59E0B", color: "#0D1117", border: "none" },
    danger:  { background: "#EF4444", color: "#fff",    border: "none" },
    blue:    { background: "rgba(59,130,246,0.12)",  color: "#3B82F6", border: "1px solid rgba(59,130,246,0.3)" },
    red:     { background: "rgba(239,68,68,0.12)",   color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" },
    ghost:   { background: "transparent",            color: "#8B949E", border: "1px solid rgba(255,255,255,0.1)" },
    green:   { background: "rgba(16,185,129,0.12)",  color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...variants[variant], borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, letterSpacing: "0.06em", transition: "opacity .15s, filter .15s", fontFamily: "'Rajdhani', sans-serif", whiteSpace: "nowrap", ...sx }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.1)"; }}
    onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
  >{children}</button>;
}
function FieldLabel({ children, required }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8B949E", letterSpacing: "0.09em", marginBottom: 6 }}>{children}{required && <span style={{ color: "#F59E0B", marginLeft: 3 }}>*</span>}</label>;
}
function FieldErr({ msg }) { return msg ? <div style={{ fontSize: 12, color: "#F87171", marginTop: 4 }}>{msg}</div> : null; }
function ErrBanner({ msg }) { return msg ? <div style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.28)", color: "#F87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>{msg}</div> : null; }
function SuccessBanner({ msg }) { return msg ? <div style={{ background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.28)", color: "#34D399", borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>{msg}</div> : null; }

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function MessagingPanel({ currentUser, mechanics }) {
  const [selectedMech, setSelectedMech]   = useState(null);
  const [messages,     setMessages]       = useState([]);
  const [allMessages,  setAllMessages]    = useState([]); // all msgs for unread counts
  const [body,         setBody]           = useState("");
  const [sending,      setSending]        = useState(false);
  const [loading,      setLoading]        = useState(false);
  const bottomRef = useRef(null);

  const isManager = currentUser.role === "manager";

  // Load ALL messages once for sidebar unread counts
  const loadAllMessages = async () => {
    const { data } = await supabase.from("messages").select("*");
    setAllMessages(data ?? []);
  };

  useEffect(() => { loadAllMessages(); }, []);

  // Load conversation when a mechanic is selected
  const loadConversation = async (mechId) => {
    setLoading(true);
    const managerId = isManager ? currentUser.id : null;
    const mechIdParam = isManager ? mechId : currentUser.id;
    const otherIdParam = isManager ? mechId : null;

    let query = supabase.from("messages").select("*").order("created_at", { ascending: true });

    if (isManager) {
      // Manager sees conversation between self and selected mechanic
      query = query.or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${mechId}),and(sender_id.eq.${mechId},receiver_id.eq.${currentUser.id})`
      );
    } else {
      // Mechanic sees all messages involving them
      query = query.or(
        `and(sender_id.eq.${currentUser.id}),and(receiver_id.eq.${currentUser.id})`
      );
    }

    const { data } = await query;
    setMessages(data ?? []);
    setLoading(false);

    // Mark unread messages as read
    const unreadIds = (data ?? [])
      .filter(m => m.receiver_id === currentUser.id && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("messages").update({ is_read: true }).in("id", unreadIds);
      loadAllMessages();
    }
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        const msg = payload.new;
        const isRelevant = isManager
          ? selectedMech && (
              (msg.sender_id === currentUser.id && msg.receiver_id === selectedMech.id) ||
              (msg.sender_id === selectedMech.id && msg.receiver_id === currentUser.id)
            )
          : (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id);

        if (isRelevant) {
          setMessages(prev => [...prev, msg]);
          // Auto mark as read if it's for the current user
          if (msg.receiver_id === currentUser.id) {
            supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
        }
        loadAllMessages();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedMech, currentUser.id]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectMech = (mech) => {
    setSelectedMech(mech);
    setMessages([]);
    loadConversation(mech.id);
  };

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    if (isManager && !selectedMech) return;
    setSending(true);

    const receiverId = isManager ? selectedMech.id : (() => {
      // Mechanic replies to manager — find manager from messages or use first message sender
      const managerMsg = messages.find(m => m.sender_id !== currentUser.id);
      return managerMsg?.sender_id ?? null;
    })();

    if (!receiverId) { setSending(false); return; }

    await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: receiverId,
      body: body.trim(),
    });

    setBody(""); setSending(false);
  };

  // Unread count per mechanic
  const unreadCount = (mechId) =>
    allMessages.filter(m => m.sender_id === mechId && m.receiver_id === currentUser.id && !m.is_read).length;

  // Total unread for mechanic (all from manager)
  const totalUnread = allMessages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;

  // For mechanic view — find the manager from messages or show a default
  const managerContact = { id: "manager", full_name: "Manager", initials: "MG" };

  // Sidebar list
  const sidebarItems = isManager ? mechanics : [managerContact];

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 180px)", minHeight: 500, background: "#161B22", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }} className="msg-layout">

      {/* ── Sidebar ── */}
      <div className="msg-sidebar" style={{ width: 260, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6E7681", letterSpacing: "0.1em" }}>
            {isManager ? "MECHANICS" : "INBOX"}
          </div>
          {!isManager && totalUnread > 0 && (
            <div style={{ fontSize: 12, color: "#F59E0B", marginTop: 4 }}>{totalUnread} unread message{totalUnread !== 1 ? "s" : ""}</div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sidebarItems.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "#484f58", fontSize: 13 }}>No mechanics yet</div>
          ) : sidebarItems.map(m => {
            const unread = isManager ? unreadCount(m.id) : totalUnread;
            const isActive = selectedMech?.id === m.id;
            return (
              <div key={m.id} onClick={() => handleSelectMech(m)} style={{ padding: "12px 18px", cursor: "pointer", background: isActive ? "rgba(245,158,11,0.07)" : "transparent", borderLeft: isActive ? "3px solid #F59E0B" : "3px solid transparent", display: "flex", alignItems: "center", gap: 10, transition: "background .1s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ position: "relative" }}>
                  <Avatar name={m.full_name} size={36} />
                  {unread > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", border: "2px solid #161B22" }}>{unread > 9 ? "9+" : unread}</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? "#E6EDF3" : "#C9D1D9" }}>{m.full_name}</div>
                  {unread > 0 && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 1 }}>{unread} unread</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selectedMech ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#484f58" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#30363D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: 14 }}>
              {isManager ? "Select a mechanic to start messaging" : "Select a conversation"}
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={selectedMech.full_name} size={36} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedMech.full_name}</div>
                <div style={{ fontSize: 11, color: "#6E7681" }}>
                  {isManager ? "Mechanic" : "Manager"}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, color: "#8B949E" }}><Spinner /> Loading messages…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#484f58", fontSize: 13, marginTop: 40 }}>
                  No messages yet. Say hello!
                </div>
              ) : messages.map(msg => {
                const isMine = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className="pop-in" style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "72%", padding: "10px 14px", borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isMine ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
                      border: isMine ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(255,255,255,0.08)",
                      fontSize: 14, lineHeight: 1.55, color: "#E6EDF3",
                      wordBreak: "break-word",
                    }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: 11, color: "#555d65", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      {timeAgo(msg.created_at)}
                      {isMine && (
                        <span style={{ color: msg.is_read ? "#10B981" : "#555d65", fontSize: 11 }}>
                          {msg.is_read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Message ${selectedMech.full_name}… (Enter to send, Shift+Enter for new line)`}
                rows={2}
                style={{ flex: 1, fontSize: 14, padding: "10px 12px", minHeight: 52, maxHeight: 120, resize: "none" }}
              />
              <Btn variant="primary" onClick={handleSend} disabled={sending || !body.trim()} style={{ padding: "12px 18px", height: 52, flexShrink: 0 }}>
                {sending ? <Spinner size={14} /> : "SEND"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      const { data, error: ae } = await supabase.auth.signInWithPassword({ email, password });
      if (ae) { setError(ae.message); setLoading(false); return; }
      const { data: profile, error: pe } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (pe) { setError("Could not load your profile."); setLoading(false); return; }
      onLogin({ ...data.user, ...profile });
    } catch { setError("Unexpected error."); setLoading(false); }
  };

  const demo = [
    { label: "Manager",  email: "manager@garage.com", pass: "garage123", color: "#F59E0B" },
    { label: "Mechanic", email: "mike@garage.com",    pass: "wrench1",   color: "#3B82F6" },
    { label: "Mechanic", email: "sarah@garage.com",   pass: "tools2",    color: "#10B981" },
    { label: "Mechanic", email: "carlos@garage.com",  pass: "motor3",    color: "#8B5CF6" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 0%, #1a1200 0%, #0D1117 60%)", padding: 20 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgba(245,158,11,0.045) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="slide-in" style={{ width: "100%", maxWidth: 420, background: "#161B22", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.6)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #F59E0B 30%, #D97706 70%, transparent)" }} />
        <div style={{ padding: "36px 36px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 68, height: 68, background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)", border: "1.5px solid rgba(245,158,11,0.35)", borderRadius: 18, marginBottom: 18 }}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                <polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                <circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/>
                <line x1="17" y1="12.5" x2="17" y2="8"  stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12.5" y1="17" x2="8"  y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.1em" }}>GARAGE<span style={{ color: "#F59E0B" }}>OPS</span></div>
            <div style={{ fontSize: 11, color: "#6E7681", marginTop: 5, letterSpacing: "0.12em", fontWeight: 600 }}>WORK ORDER MANAGEMENT SYSTEM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><FieldLabel>EMAIL</FieldLabel><input type="email" value={email} autoFocus onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="your@email.com" /></div>
            <div><FieldLabel>PASSWORD</FieldLabel><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your password" /></div>
            <ErrBanner msg={error} />
            <Btn variant="primary" onClick={handleLogin} disabled={loading || !email || !password} style={{ width: "100%", padding: "12px", fontSize: 15, marginTop: 4 }}>
              {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Spinner size={16} /> AUTHENTICATING…</span> : "SIGN IN  →"}
            </Btn>
          </div>
          <div style={{ marginTop: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#555d65", letterSpacing: "0.12em", marginBottom: 8 }}>DEMO CREDENTIALS</div>
            {demo.map(d => (
              <div key={d.email} onClick={() => { setEmail(d.email); setPassword(d.pass); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12 }} onMouseEnter={e => e.currentTarget.style.opacity = ".75"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <span style={{ fontSize: 10, fontWeight: 700, color: d.color, background: d.color + "18", border: `1px solid ${d.color}35`, borderRadius: 4, padding: "1px 6px", minWidth: 60, textAlign: "center" }}>{d.label.toUpperCase()}</span>
                <span className="mono" style={{ color: "#8B949E", fontSize: 12 }}>{d.email} / {d.pass}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#484f58", marginTop: 8 }}>Click any row to auto-fill</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP NAV
// ═══════════════════════════════════════════════════════════════════════════════

function TopNav({ user, onLogout, unreadCount = 0 }) {
  return (
    <div style={{ height: 58, background: "#161B22", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 24px", gap: 14, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
          <polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          <circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/>
          <line x1="17" y1="12.5" x2="17" y2="8"  stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12.5" y1="17" x2="8"  y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "0.07em" }}>GARAGE<span style={{ color: "#F59E0B" }}>OPS</span></span>
      </div>
      <div style={{ background: user.role === "manager" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)", color: user.role === "manager" ? "#F59E0B" : "#3B82F6", border: `1px solid ${user.role === "manager" ? "rgba(245,158,11,0.3)" : "rgba(59,130,246,0.3)"}`, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}>{user.role.toUpperCase()}</div>
      <div style={{ flex: 1 }} />
      {unreadCount > 0 && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
          <span>●</span> {unreadCount} unread
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={user.full_name} size={30} />
        <div className="hide-mobile"><div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{user.full_name}</div></div>
      </div>
      <Btn variant="ghost" onClick={onLogout} style={{ padding: "6px 14px", fontSize: 12 }}>LOG OUT</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

function StatsCards({ orders }) {
  const t = orders.length, p = orders.filter(o => o.status === "Pending").length, ip = orders.filter(o => o.status === "In Progress").length, c = orders.filter(o => o.status === "Completed").length;
  return (
    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
      {[{ label: "TOTAL ORDERS", value: t, color: "#E6EDF3" }, { label: "PENDING", value: p, color: "#F59E0B" }, { label: "IN PROGRESS", value: ip, color: "#3B82F6" }, { label: "COMPLETED", value: c, color: "#10B981" }].map(card => (
        <div key={card.label} style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6E7681", letterSpacing: "0.12em", marginBottom: 10 }}>{card.label}</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
          {t > 0 && card.label !== "TOTAL ORDERS" && <div style={{ fontSize: 11, color: "#6E7681", marginTop: 6 }}>{Math.round((card.value / t) * 100)}% of total</div>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD MECHANIC MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function AddMechanicModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [success, setSuccess] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())              e.name     = "Full name is required";
    if (!form.email.trim())             e.email    = "Email is required";
    if (!form.password)                 e.password = "Password is required";
    else if (form.password.length < 6)  e.password = "Minimum 6 characters";
    if (form.confirm !== form.password) e.confirm  = "Passwords do not match";
    return e;
  };

  const handleCreate = async () => {
    const e = validate(); if (Object.keys(e).length) { setErrs(e); return; }
    setSaving(true); setApiErr(""); setSuccess("");
    const { data, error: se } = await authClient.auth.signUp({ email: form.email.trim().toLowerCase(), password: form.password });
    if (se) { setApiErr(se.message); setSaving(false); return; }
    const newId = data.user?.id;
    if (!newId) { setApiErr("User created but ID not returned."); setSaving(false); return; }
    await authClient.auth.signOut();
    const { error: pe } = await supabase.from("profiles").insert({ id: newId, full_name: form.name.trim(), initials: getInitials(form.name), role: "mechanic" });
    if (pe) { setApiErr(pe.message); setSaving(false); return; }
    setSuccess(`Account created! ${form.name} can now log in with ${form.email.trim().toLowerCase()}.`);
    setSaving(false); onCreated();
    setTimeout(() => { setSuccess(""); onClose(); }, 3000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200, backdropFilter: "blur(3px)" }}>
      <div className="slide-in" style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 480 }}>
        <div style={{ padding: "20px 26px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.05em" }}>ADD MECHANIC ACCOUNT</div><div style={{ fontSize: 12, color: "#8B949E", marginTop: 3 }}>Creates a new login for a mechanic on your team</div></div>
          <button onClick={onClose} disabled={saving} style={{ background: "none", border: "none", color: "#6E7681", fontSize: 24, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
        <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div><FieldLabel required>Full Name</FieldLabel><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. James Carter" /><FieldErr msg={errs.name} /></div>
          <div><FieldLabel required>Email Address</FieldLabel><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="mechanic@yourgarage.com" /><FieldErr msg={errs.email} /></div>
          <div><FieldLabel required>Password</FieldLabel><input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Minimum 6 characters" /><FieldErr msg={errs.password} /></div>
          <div><FieldLabel required>Confirm Password</FieldLabel><input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} placeholder="Re-enter password" /><FieldErr msg={errs.confirm} /></div>
          <ErrBanner msg={apiErr} /><SuccessBanner msg={success} />
          <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#8B949E", lineHeight: 1.6 }}>
            Role is automatically set to <strong style={{ color: "#F59E0B" }}>Mechanic</strong> — no manager access.
          </div>
        </div>
        <div style={{ padding: "16px 26px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>CANCEL</Btn>
          <Btn variant="green" onClick={handleCreate} disabled={saving}>
            {saving ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} /> CREATING…</span> : "CREATE ACCOUNT"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE MECHANIC MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function DeleteMechanicModal({ mechanic, orderCount, onConfirm, onClose, deleting }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200, backdropFilter: "blur(3px)" }}>
      <div className="slide-in" style={{ background: "#1C2333", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 460 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="#EF4444" strokeWidth="2"/>
            <line x1="18" y1="8" x2="23" y2="13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
            <line x1="23" y1="8" x2="18" y2="13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Remove Mechanic Account</div>
        <div style={{ color: "#8B949E", fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>You are about to remove <strong style={{ color: "#E6EDF3" }}>{mechanic.full_name}</strong> from the system.</div>
        {orderCount > 0 && <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#D97706", marginBottom: 16, lineHeight: 1.6 }}>⚠ This mechanic has <strong>{orderCount}</strong> assigned work order{orderCount !== 1 ? "s" : ""}. They will be set to <strong>Unassigned</strong>.</div>}
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#8B949E", marginBottom: 24, lineHeight: 1.6 }}>Profile and login access will be permanently removed. This action <strong style={{ color: "#F87171" }}>cannot be undone</strong>.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={deleting}>CANCEL</Btn>
          <Btn variant="danger" onClick={onConfirm} disabled={deleting}>{deleting ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} /> REMOVING…</span> : "REMOVE MECHANIC"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANICS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function MechanicsPanel({ mechanics, orders, onAdd, onDelete, loading }) {
  const cnt = (id, status) => orders.filter(o => o.mechanic_id === id && (!status || o.status === status)).length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: "#8B949E" }}>{mechanics.length} mechanic{mechanics.length !== 1 ? "s" : ""} on your team</div>
        <Btn variant="green" onClick={onAdd} style={{ padding: "9px 20px" }}>+ ADD MECHANIC</Btn>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "#8B949E" }}><Spinner /> Loading team…</div>
      ) : mechanics.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#6E7681" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👷</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>No Mechanics Yet</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Add your first mechanic to start assigning work orders.</div>
          <Btn variant="green" onClick={onAdd}>+ ADD MECHANIC</Btn>
        </div>
      ) : (
        <div className="mechanic-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {mechanics.map(m => {
            const total = cnt(m.id), pending = cnt(m.id, "Pending"), inProg = cnt(m.id, "In Progress"), done = cnt(m.id, "Completed");
            return (
              <div key={m.id} style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 20px 16px", transition: "border-color .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <Avatar name={m.full_name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.full_name}</div>
                    <div style={{ fontSize: 12, color: "#6E7681", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email ?? "—"}</div>
                  </div>
                  <div style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>MECHANIC</div>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "#555d65", letterSpacing: "0.1em", marginBottom: 10 }}>ORDER SUMMARY</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
                  {[{ label: "Total", value: total, color: "#E6EDF3" }, { label: "Pending", value: pending, color: "#F59E0B" }, { label: "Active", value: inProg, color: "#3B82F6" }, { label: "Done", value: done, color: "#10B981" }].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "#555d65", marginTop: 4, letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                  <Btn variant="red" onClick={() => onDelete(m)} style={{ width: "100%", padding: "8px", fontSize: 12 }}>REMOVE ACCOUNT</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function OrderModal({ mode, order, mechanics, onSave, onClose, saving }) {
  const [form, setForm] = useState(mode === "edit" ? { ...order, mechanic_id: order.mechanic_id ?? "" } : { customer: "", make: "Toyota", model: "", year: currentYear, vin: "", task: "", mechanic_id: "", status: "Pending" });
  const [errs, setErrs] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => { const e = {}; if (!form.customer.trim()) e.customer = "Required"; if (!form.model.trim()) e.model = "Required"; if (!form.vin.trim()) e.vin = "Required"; else if (form.vin.trim().length !== 17) e.vin = "Must be 17 characters"; if (!form.task.trim()) e.task = "Required"; return e; };
  const handleSave = () => { const e = validate(); if (Object.keys(e).length) { setErrs(e); return; } onSave({ ...form, vin: form.vin.toUpperCase().trim(), year: parseInt(form.year), mechanic_id: form.mechanic_id || null }); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200, backdropFilter: "blur(3px)" }}>
      <div className="slide-in" style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ padding: "20px 26px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div><div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.05em" }}>{mode === "create" ? "NEW WORK ORDER" : `EDIT ORDER — ${order.order_number}`}</div><div style={{ fontSize: 12, color: "#8B949E", marginTop: 3 }}>{mode === "create" ? "Fill in all required fields" : "Modify details — all fields editable by manager"}</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6E7681", fontSize: 24, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
        <div style={{ padding: "24px 26px" }}>
          <div className="modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}><FieldLabel required>Customer Name</FieldLabel><input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Full name" /><FieldErr msg={errs.customer} /></div>
            <div><FieldLabel required>Make</FieldLabel><select value={form.make} onChange={e => set("make", e.target.value)}>{MAKES.map(m => <option key={m}>{m}</option>)}</select></div>
            <div><FieldLabel required>Model</FieldLabel><input value={form.model} onChange={e => set("model", e.target.value)} placeholder="e.g. Camry" /><FieldErr msg={errs.model} /></div>
            <div><FieldLabel>Year</FieldLabel><select value={form.year} onChange={e => set("year", e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select></div>
            <div><FieldLabel required>VIN (17 characters)</FieldLabel><input value={form.vin} onChange={e => set("vin", e.target.value.toUpperCase())} placeholder="1HGCM82633A123456" maxLength={17} className="mono" style={{ fontSize: 13, letterSpacing: "0.06em" }} /><div style={{ fontSize: 11, color: form.vin.length === 17 ? "#10B981" : "#6E7681", marginTop: 4 }}>{form.vin.length}/17 chars</div><FieldErr msg={errs.vin} /></div>
            <div><FieldLabel>Assign Mechanic</FieldLabel><select value={form.mechanic_id} onChange={e => set("mechanic_id", e.target.value)}><option value="">— Unassigned —</option>{mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
            <div><FieldLabel>Status</FieldLabel><select value={form.status} onChange={e => set("status", e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div style={{ gridColumn: "1 / -1" }}><FieldLabel required>Task Description</FieldLabel><textarea value={form.task} onChange={e => set("task", e.target.value)} placeholder="Describe the work to be performed..." rows={4} style={{ resize: "vertical", minHeight: 80 }} /><FieldErr msg={errs.task} /></div>
          </div>
        </div>
        <div style={{ padding: "16px 26px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>CANCEL</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} /> SAVING…</span> : mode === "create" ? "CREATE ORDER" : "SAVE CHANGES"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE ORDER MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function DeleteOrderModal({ order, onConfirm, onClose, deleting }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200, backdropFilter: "blur(3px)" }}>
      <div className="slide-in" style={{ background: "#1C2333", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 450 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Delete Work Order</div>
        <div style={{ color: "#8B949E", fontSize: 14, lineHeight: 1.7, marginBottom: 26 }}>
          Permanently delete <span className="mono" style={{ color: "#F59E0B", fontSize: 13 }}>{order.order_number}</span> for <strong style={{ color: "#E6EDF3" }}>{order.customer}</strong> ({order.year} {order.make} {order.model}).<br />This action <strong style={{ color: "#F87171" }}>cannot be undone</strong>.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose} disabled={deleting}>CANCEL</Btn>
          <Btn variant="danger" onClick={onConfirm} disabled={deleting}>{deleting ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner size={14} /> DELETING…</span> : "DELETE ORDER"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDERS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

function WorkOrderTable({ orders, mechanics, onEdit, onDelete, onCreate, loading }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const toggleSort = field => { if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("asc"); } };
  const mechName = id => mechanics.find(m => m.id === id)?.full_name ?? "Unassigned";
  const filtered = orders
    .filter(o => { const q = search.toLowerCase(); const mq = !q || [o.order_number, o.customer, o.make, o.model, o.vin].some(v => (v ?? "").toLowerCase().includes(q)); return mq && (filterStatus === "All" || o.status === filterStatus); })
    .sort((a, b) => { let va = a[sortField] ?? "", vb = b[sortField] ?? ""; if (typeof va === "string") va = va.toLowerCase(); if (typeof vb === "string") vb = vb.toLowerCase(); return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0); });
  const TH = ({ label, field }) => (
    <th onClick={field ? () => toggleSort(field) : undefined} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6E7681", letterSpacing: "0.1em", whiteSpace: "nowrap", cursor: field ? "pointer" : "default", userSelect: "none" }}
      onMouseEnter={e => { if (field) e.currentTarget.style.color = "#8B949E"; }} onMouseLeave={e => { if (field) e.currentTarget.style.color = "#6E7681"; }}>
      {label}{field && <span style={{ marginLeft: 4, color: sortField === field ? "#F59E0B" : "#404953" }}>{sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>}
    </th>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders, customers, VIN…" style={{ flex: 1, minWidth: 180 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 148 }}><option>All</option>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
        <Btn variant="primary" onClick={onCreate} style={{ padding: "9px 20px" }}>+ NEW ORDER</Btn>
      </div>
      <div style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "#8B949E" }}><Spinner /> Loading orders…</div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}><TH label="ORDER #" field="order_number" /><TH label="CUSTOMER" field="customer" /><TH label="VEHICLE" /><TH label="MECHANIC" /><TH label="TASK" /><TH label="STATUS" field="status" /><TH label="DATE" field="created_at" /><TH label="ACTIONS" /></tr></thead>
              <tbody>
                {filtered.length === 0 ? (<tr><td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "#6E7681" }}><div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div><div>No work orders match</div></td></tr>) :
                  filtered.map((o, i) => (
                    <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.018)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px" }}><span className="mono" style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>{o.order_number}</span></td>
                      <td style={{ padding: "14px 16px" }}><div style={{ fontWeight: 600, fontSize: 14 }}>{o.customer}</div></td>
                      <td style={{ padding: "14px 16px" }}><div style={{ fontSize: 14, fontWeight: 600 }}>{o.year} {o.make} {o.model}</div><div className="mono" style={{ fontSize: 11, color: "#6E7681", marginTop: 2 }}>{o.vin}</div></td>
                      <td style={{ padding: "14px 16px" }}><div style={{ fontSize: 13, color: "#8B949E" }}>{mechName(o.mechanic_id)}</div></td>
                      <td style={{ padding: "14px 16px", maxWidth: 240 }}><div style={{ fontSize: 13, color: "#C9D1D9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 230 }} title={o.task}>{o.task}</div></td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: "14px 16px" }}><span className="mono" style={{ fontSize: 12, color: "#6E7681" }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</span></td>
                      <td style={{ padding: "14px 16px" }}><div style={{ display: "flex", gap: 6 }}><Btn variant="blue" onClick={() => onEdit(o)} style={{ padding: "5px 12px", fontSize: 11 }}>EDIT</Btn><Btn variant="red" onClick={() => onDelete(o)} style={{ padding: "5px 12px", fontSize: 11 }}>DEL</Btn></div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#555d65", marginTop: 10 }}>{filtered.length} of {orders.length} orders · Click column header to sort</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerDashboard({ user, onLogout }) {
  const [orders,       setOrders]       = useState([]);
  const [mechanics,    setMechanics]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("orders");
  const [modal,        setModal]        = useState(null);
  const [selected,     setSelected]     = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [dbError,      setDbError]      = useState("");
  const [showAddMech,  setShowAddMech]  = useState(false);
  const [selectedMech, setSelectedMech] = useState(null);
  const [deletingMech, setDeletingMech] = useState(false);
  const [unreadTotal,  setUnreadTotal]  = useState(0);

  const loadOrders    = async () => { const { data, error } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false }); if (error) setDbError(error.message); else setOrders(data ?? []); };
  const loadMechanics = async () => { const { data } = await supabase.from("profiles").select("*").eq("role", "mechanic"); setMechanics(data ?? []); };
  const loadUnread    = async () => { const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false); setUnreadTotal(count ?? 0); };

  useEffect(() => { setLoading(true); Promise.all([loadOrders(), loadMechanics(), loadUnread()]).finally(() => setLoading(false)); }, []);

  // Realtime unread badge on nav
  useEffect(() => {
    const ch = supabase.channel("manager-unread").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => loadUnread()).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const closeOrder = () => { setModal(null); setSelected(null); setSaving(false); setDeleting(false); };

  const handleSave = async (form) => {
    setSaving(true); setDbError("");
    if (modal === "create") {
      const { error } = await supabase.from("work_orders").insert({ customer: form.customer, make: form.make, model: form.model, year: form.year, vin: form.vin, task: form.task, status: form.status, mechanic_id: form.mechanic_id || null, created_by: user.id });
      if (error) { setDbError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("work_orders").update({ customer: form.customer, make: form.make, model: form.model, year: form.year, vin: form.vin, task: form.task, status: form.status, mechanic_id: form.mechanic_id || null, updated_at: todayStr() }).eq("id", form.id);
      if (error) { setDbError(error.message); setSaving(false); return; }
    }
    await loadOrders(); closeOrder();
  };

  const handleDeleteOrder = async () => {
    setDeleting(true); setDbError("");
    const { error } = await supabase.from("work_orders").delete().eq("id", selected.id);
    if (error) { setDbError(error.message); setDeleting(false); return; }
    await loadOrders(); closeOrder();
  };

  const handleDeleteMechanic = async () => {
    setDeletingMech(true); setDbError("");
    await supabase.from("work_orders").update({ mechanic_id: null, updated_at: todayStr() }).eq("mechanic_id", selectedMech.id);
    const { error } = await supabase.from("profiles").delete().eq("id", selectedMech.id);
    if (error) { setDbError(error.message); setDeletingMech(false); return; }
    await Promise.all([loadOrders(), loadMechanics()]);
    setSelectedMech(null); setDeletingMech(false);
  };

  const TAB = ({ id, label, count, badge }) => (
    <button onClick={() => { setActiveTab(id); if (id === "messages") loadUnread(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", marginRight: 28, fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", color: activeTab === id ? "#E6EDF3" : "#6E7681", borderBottom: activeTab === id ? "2px solid #F59E0B" : "2px solid transparent", transition: "color .15s, border-color .15s", fontFamily: "'Rajdhani', sans-serif", position: "relative" }}>
      {label}
      {count !== undefined && <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "1px 7px", fontSize: 11, color: "#8B949E" }}>{count}</span>}
      {badge > 0 && <span style={{ marginLeft: 6, background: "#EF4444", borderRadius: 10, padding: "1px 6px", fontSize: 10, color: "#fff", fontWeight: 700 }}>{badge}</span>}
    </button>
  );

  return (
    <div style={{ background: "#0D1117", minHeight: "100vh" }}>
      <TopNav user={user} onLogout={onLogout} unreadCount={unreadTotal} />
      <div className="page-pad" style={{ padding: "28px 24px", maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.05em" }}>MANAGER DASHBOARD</h1>
          <p style={{ fontSize: 13, color: "#8B949E", marginTop: 4 }}>Full control over orders, team accounts, and messaging</p>
        </div>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24, marginTop: 16 }}>
          <TAB id="orders"   label="WORK ORDERS" count={orders.length} />
          <TAB id="team"     label="TEAM"        count={mechanics.length} />
          <TAB id="messages" label="MESSAGES"    badge={unreadTotal} />
        </div>
        <ErrBanner msg={dbError} />
        {activeTab === "orders" && (
          <><StatsCards orders={orders} /><WorkOrderTable orders={orders} mechanics={mechanics} loading={loading} onCreate={() => setModal("create")} onEdit={o => { setSelected(o); setModal("edit"); }} onDelete={o => { setSelected(o); setModal("delete"); }} /></>
        )}
        {activeTab === "team" && (
          <MechanicsPanel mechanics={mechanics} orders={orders} loading={loading} onAdd={() => setShowAddMech(true)} onDelete={m => setSelectedMech(m)} />
        )}
        {activeTab === "messages" && (
          <MessagingPanel currentUser={user} mechanics={mechanics} />
        )}
      </div>

      {(modal === "create" || modal === "edit") && <OrderModal mode={modal} order={selected} mechanics={mechanics} onSave={handleSave} onClose={closeOrder} saving={saving} />}
      {modal === "delete"  && <DeleteOrderModal    order={selected}    onConfirm={handleDeleteOrder}    onClose={closeOrder}           deleting={deleting}     />}
      {showAddMech         && <AddMechanicModal                        onClose={() => setShowAddMech(false)} onCreated={() => loadMechanics()} />}
      {selectedMech        && <DeleteMechanicModal mechanic={selectedMech} orderCount={orders.filter(o => o.mechanic_id === selectedMech.id).length} onConfirm={handleDeleteMechanic} onClose={() => setSelectedMech(null)} deleting={deletingMech} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANIC DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function MechanicDashboard({ user, onLogout }) {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [dbError,    setDbError]    = useState("");
  const [activeTab,  setActiveTab]  = useState("orders");
  const [unreadTotal,setUnreadTotal]= useState(0);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("work_orders").select("*").eq("mechanic_id", user.id).order("created_at", { ascending: false });
    if (error) setDbError(error.message); else setOrders(data ?? []);
    setLoading(false);
  };

  const loadUnread = async () => {
    const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
    setUnreadTotal(count ?? 0);
  };

  useEffect(() => { loadOrders(); loadUnread(); }, []);

  useEffect(() => {
    const ch = supabase.channel("mechanic-unread").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => loadUnread()).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const handleStatus = async (id, status) => {
    const { error } = await supabase.from("work_orders").update({ status, updated_at: todayStr() }).eq("id", id);
    if (error) { setDbError(error.message); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const cols = {
    "Pending":     { color: "#F59E0B", items: orders.filter(o => o.status === "Pending")     },
    "In Progress": { color: "#3B82F6", items: orders.filter(o => o.status === "In Progress") },
    "Completed":   { color: "#10B981", items: orders.filter(o => o.status === "Completed")   },
  };

  const TAB = ({ id, label, badge }) => (
    <button onClick={() => { setActiveTab(id); if (id === "messages") loadUnread(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", marginRight: 28, fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", color: activeTab === id ? "#E6EDF3" : "#6E7681", borderBottom: activeTab === id ? "2px solid #3B82F6" : "2px solid transparent", transition: "color .15s, border-color .15s", fontFamily: "'Rajdhani', sans-serif" }}>
      {label}
      {badge > 0 && <span style={{ marginLeft: 6, background: "#EF4444", borderRadius: 10, padding: "1px 6px", fontSize: 10, color: "#fff", fontWeight: 700 }}>{badge}</span>}
    </button>
  );

  // For mechanic messaging — find the manager profile to show in sidebar
  const [managerProfile, setManagerProfile] = useState(null);
  useEffect(() => {
    supabase.from("profiles").select("*").eq("role", "manager").single().then(({ data }) => setManagerProfile(data));
  }, []);

  return (
    <div style={{ background: "#0D1117", minHeight: "100vh" }}>
      <TopNav user={user} onLogout={onLogout} unreadCount={unreadTotal} />
      <div className="page-pad" style={{ padding: "28px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.05em" }}>MY DASHBOARD</h1>
          <p style={{ fontSize: 13, color: "#8B949E", marginTop: 4 }}>{user.full_name} · Mechanic</p>
        </div>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24, marginTop: 16 }}>
          <TAB id="orders"   label="MY ORDERS" />
          <TAB id="messages" label="MESSAGES"  badge={unreadTotal} />
        </div>
        <ErrBanner msg={dbError} />

        {activeTab === "orders" && (
          <>
            <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#6E7681", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>ℹ️</span>
              <span><strong style={{ color: "#8B949E" }}>Mechanic view: </strong>Task descriptions are read-only. You can only change the <strong style={{ color: "#3B82F6" }}>status</strong> of your assigned orders.</span>
            </div>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 12, color: "#8B949E" }}><Spinner /> Loading your assignments…</div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 24px", background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#6E7681" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🔧</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No Orders Assigned</div>
                <div style={{ fontSize: 14 }}>Your manager hasn't assigned any work orders to you yet.</div>
              </div>
            ) : (
              <div className="kanban-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
                {Object.entries(cols).map(([label, col]) => (
                  <div key={label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12, marginBottom: 12, borderBottom: `2px solid ${col.color}28` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, boxShadow: `0 0 6px ${col.color}80` }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: col.color }}>{label.toUpperCase()}</span>
                      <span style={{ marginLeft: "auto", background: col.color + "1a", color: col.color, border: `1px solid ${col.color}30`, borderRadius: 12, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{col.items.length}</span>
                    </div>
                    {col.items.length === 0 ? (
                      <div style={{ border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 10, padding: "28px 16px", textAlign: "center", color: "#484f58", fontSize: 13 }}>No orders here</div>
                    ) : col.items.map(o => {
                      const m = STATUS_META[o.status] ?? STATUS_META["Pending"];
                      return (
                        <div key={o.id} className="slide-in" style={{ background: "#1C2333", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${m.color}`, borderRadius: 10, padding: 16, marginBottom: 10, transition: "transform .15s, box-shadow .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.35)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span className="mono" style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>{o.order_number}</span>
                            <StatusBadge status={o.status} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{o.customer}</div>
                          <div style={{ fontSize: 13, color: "#8B949E", marginBottom: 12 }}>{o.year} {o.make} {o.model}</div>
                          <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.55, borderLeft: "2px solid rgba(245,158,11,0.25)", padding: "8px 10px", marginBottom: 16, background: "rgba(255,255,255,0.02)", borderRadius: "0 6px 6px 0" }}>{o.task}</div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#6E7681", letterSpacing: "0.1em", marginBottom: 6 }}>UPDATE STATUS</div>
                            <select value={o.status} onChange={e => handleStatus(o.id, e.target.value)} style={{ fontSize: 13 }}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select>
                          </div>
                          <div style={{ marginTop: 10, fontSize: 11, color: "#555d65" }}>Created {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "messages" && (
          <MessagingPanel
            currentUser={user}
            mechanics={managerProfile ? [managerProfile] : []}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) setUser({ ...session.user, ...profile });
      }
      setCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") { setUser(null); return; }
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (profile) setUser({ ...session.user, ...profile });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (checkingAuth) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1117" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Spinner size={36} />
        <div style={{ color: "#6E7681", fontSize: 14, letterSpacing: "0.06em" }}>LOADING…</div>
      </div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.role === "manager") return <ManagerDashboard user={user} onLogout={handleLogout} />;
  return <MechanicDashboard user={user} onLogout={handleLogout} />;
}
