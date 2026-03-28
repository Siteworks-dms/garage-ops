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
const VEHICLE_COLORS = ["Black","White","Silver","Gray","Red","Blue","Green","Brown","Beige","Orange","Yellow","Gold","Purple","Maroon","Navy","Champagne","Other"];
const MAKES = ["Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jeep","Kia","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: #0D1117; color: #E6EDF3; font-family: 'Rajdhani', system-ui, sans-serif; font-size: 15px; line-height: 1.5; min-height: 100vh; min-height: -webkit-fill-available; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #30363D; border-radius: 2px; }

  input, select, textarea {
    background: #0D1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    color: #E6EDF3; font-family: 'Rajdhani', sans-serif; font-size: 16px;
    padding: 10px 14px; width: 100%; outline: none;
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none; appearance: none;
    min-height: 44px;
  }
  input[type="date"] { color-scheme: dark; }
  input:focus, select:focus, textarea:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,0.08); }
  select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236E7681' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
  select option { background: #1C2333; }
  textarea { resize: none; min-height: 80px; }
  .mono { font-family: 'JetBrains Mono', monospace !important; }

  @keyframes slideIn  { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes popIn    { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  @keyframes ticker   { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
  .slide-in { animation: slideIn .2s ease forwards; }
  .slide-up { animation: slideUp .2s ease forwards; }
  .pop-in   { animation: popIn  .15s ease forwards; }

  /* ── MOBILE FIRST ── */
  .stats-grid   { grid-template-columns: repeat(2,1fr) !important; }
  .kanban-grid  { grid-template-columns: 1fr !important; }
  .modal-grid   { grid-template-columns: 1fr !important; }
  .mechanic-grid{ grid-template-columns: 1fr !important; }
  .msg-layout   { flex-direction: column !important; }
  .msg-sidebar  { width: 100% !important; max-height: 160px !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; }
  .hide-mobile  { display: none !important; }
  .page-pad     { padding: 14px 14px !important; }
  .table-wrap   { display: none !important; }
  .card-list    { display: block !important; }

  /* ── TABLET (600px+) ── */
  @media (min-width: 600px) {
    .hide-mobile  { display: flex !important; }
    .page-pad     { padding: 20px 20px !important; }
    .stats-grid   { grid-template-columns: repeat(3,1fr) !important; }
  }

  /* ── DESKTOP (900px+) ── */
  @media (min-width: 900px) {
    .stats-grid    { grid-template-columns: repeat(5,1fr) !important; }
    .kanban-grid   { grid-template-columns: repeat(3,1fr) !important; }
    .modal-grid    { grid-template-columns: 1fr 1fr !important; }
    .mechanic-grid { grid-template-columns: repeat(3,1fr) !important; }
    .msg-layout    { flex-direction: row !important; }
    .msg-sidebar   { width: 260px !important; max-height: none !important; border-right: 1px solid rgba(255,255,255,0.07) !important; border-bottom: none !important; }
    .page-pad      { padding: 28px 24px !important; }
    .table-wrap    { display: block !important; }
    .card-list     { display: none !important; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const todayStr    = () => new Date().toISOString();
const currentYear = new Date().getFullYear();
const years       = Array.from({ length: 32 }, (_, i) => currentYear + 1 - i);

function getInitials(name = "") { return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2); }
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysOnLot(dateReceived) {
  if (!dateReceived) return null;
  const received = new Date(dateReceived + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((today - received) / 86400000);
  return diff < 0 ? 0 : diff;
}
function lotColor(days) {
  if (days === null) return "#6E7681";
  if (days >= 30) return "#EF4444";
  if (days >= 14) return "#F59E0B";
  return "#10B981";
}
function lotLabel(days) {
  if (days === null) return "";
  if (days >= 30) return "⚠ Over 30 days";
  if (days >= 14) return "Getting long";
  return "Recent";
}

const COLOR_MAP = {
  Black:"#1a1a1a", White:"#f0f0f0", Silver:"#C0C0C0", Gray:"#808080",
  Red:"#DC2626", Blue:"#2563EB", Green:"#16A34A", Brown:"#92400E",
  Beige:"#D4B896", Orange:"#EA580C", Yellow:"#CA8A04", Gold:"#B7960C",
  Purple:"#7C3AED", Maroon:"#881337", Navy:"#1E3A5F", Champagne:"#C9A96E", Other:"#6E7681",
};
function ColorDot({ color, size = 12 }) {
  if (!color) return null;
  const hex = COLOR_MAP[color] ?? "#6E7681";
  const needsBorder = ["White","Beige","Champagne"].includes(color);
  return <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:hex, border:needsBorder?"1px solid rgba(255,255,255,0.2)":"none", flexShrink:0, verticalAlign:"middle" }} />;
}
function LotBadge({ dateReceived }) {
  const d = daysOnLot(dateReceived);
  if (d === null) return <span style={{ color:"#484f58", fontSize:12 }}>—</span>;
  const col = lotColor(d);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <span style={{ fontSize:15, fontWeight:700, color:col, lineHeight:1 }}>{d}</span>
      <span style={{ fontSize:11, color:"#555d65" }}>days</span>
      {d >= 30 && <span style={{ fontSize:11, color:"#EF4444" }}>⚠</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════════════════

function Spinner({ size = 20 }) {
  return <div style={{ width:size, height:size, border:"2px solid rgba(245,158,11,0.2)", borderTop:"2px solid #F59E0B", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block", flexShrink:0 }} />;
}
function StatusBadge({ status, large = false }) {
  const m = STATUS_META[status] ?? STATUS_META["Pending"];
  return (
    <span style={{ background:m.bg, color:m.color, border:`1px solid ${m.border}`, borderRadius:20, padding: large ? "5px 14px" : "3px 11px", fontSize: large ? 14 : 12, fontWeight:700, letterSpacing:"0.03em", whiteSpace:"nowrap", fontFamily:"'Rajdhani',sans-serif", display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width: large ? 8 : 6, height: large ? 8 : 6, borderRadius:"50%", background:m.color, flexShrink:0 }} />
      {status}
    </span>
  );
}
function Avatar({ name = "", size = 36 }) {
  const initials = getInitials(name);
  const palette = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"];
  const col = palette[(name.charCodeAt(0) || 0) % palette.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:col+"22", border:`1.5px solid ${col}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*.36), fontWeight:700, color:col, flexShrink:0, letterSpacing:"0.05em", userSelect:"none" }}>{initials}</div>;
}
function Btn({ children, variant = "ghost", onClick, disabled, style: sx = {} }) {
  const variants = {
    primary:{ background:"#F59E0B", color:"#0D1117", border:"none" },
    danger: { background:"#EF4444", color:"#fff",    border:"none" },
    blue:   { background:"rgba(59,130,246,0.12)",  color:"#3B82F6", border:"1px solid rgba(59,130,246,0.3)" },
    red:    { background:"rgba(239,68,68,0.12)",   color:"#EF4444", border:"1px solid rgba(239,68,68,0.3)" },
    ghost:  { background:"transparent",            color:"#8B949E", border:"1px solid rgba(255,255,255,0.1)" },
    green:  { background:"rgba(16,185,129,0.12)",  color:"#10B981", border:"1px solid rgba(16,185,129,0.3)" },
    purple: { background:"rgba(139,92,246,0.12)",  color:"#8B5CF6", border:"1px solid rgba(139,92,246,0.3)" },
  };
  return <button onClick={onClick} disabled={disabled}
    style={{ ...variants[variant], borderRadius:8, padding:"10px 18px", fontSize:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, letterSpacing:"0.06em", transition:"opacity .15s, filter .15s", fontFamily:"'Rajdhani',sans-serif", whiteSpace:"nowrap", minHeight:44, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, touchAction:"manipulation", ...sx }}
    onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.filter="brightness(1.1)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}
  >{children}</button>;
}
function FieldLabel({ children, required }) {
  return <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8B949E", letterSpacing:"0.09em", marginBottom:6 }}>{children}{required&&<span style={{ color:"#F59E0B", marginLeft:3 }}>*</span>}</label>;
}
function FieldErr({ msg }) { return msg ? <div style={{ fontSize:12, color:"#F87171", marginTop:4 }}>{msg}</div> : null; }
function ErrBanner({ msg }) { return msg ? <div style={{ background:"rgba(239,68,68,0.09)", border:"1px solid rgba(239,68,68,0.28)", color:"#F87171", borderRadius:8, padding:"10px 14px", fontSize:13, lineHeight:1.5, marginTop:8 }}>{msg}</div> : null; }
function SuccessBanner({ msg }) { return msg ? <div style={{ background:"rgba(16,185,129,0.09)", border:"1px solid rgba(16,185,129,0.28)", color:"#34D399", borderRadius:8, padding:"10px 14px", fontSize:13, lineHeight:1.5, marginTop:8 }}>{msg}</div> : null; }

// ═══════════════════════════════════════════════════════════════════════════════
// TV DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function TVClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const pad = n => String(n).padStart(2, "0");
  return (
    <div style={{ textAlign:"right" }}>
      <div style={{ fontSize:42, fontWeight:700, letterSpacing:"0.06em", lineHeight:1, color:"#E6EDF3", fontFamily:"'JetBrains Mono',monospace" }}>
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </div>
      <div style={{ fontSize:14, color:"#6E7681", marginTop:4, letterSpacing:"0.08em" }}>
        {time.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
      </div>
    </div>
  );
}

function TVStatusPill({ status }) {
  const meta = { "Pending":{color:"#F59E0B",bg:"rgba(245,158,11,0.15)"}, "In Progress":{color:"#3B82F6",bg:"rgba(59,130,246,0.15)"}, "Completed":{color:"#10B981",bg:"rgba(16,185,129,0.15)"} };
  const m = meta[status] ?? meta["Pending"];
  return <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:m.bg, color:m.color, borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:700, whiteSpace:"nowrap" }}><span style={{ width:7, height:7, borderRadius:"50%", background:m.color, display:"inline-block", ...(status==="In Progress"?{animation:"pulse 1.5s ease-in-out infinite"}:{}) }}/>{status}</span>;
}

function TVMechanicCard({ mechanic, orders }) {
  const palette = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"];
  const col = palette[(mechanic.full_name.charCodeAt(0)||0)%palette.length];
  const active = orders.filter(o=>o.status==="In Progress");
  const pending= orders.filter(o=>o.status==="Pending");
  const done   = orders.filter(o=>o.status==="Completed");
  return (
    <div style={{ background:"#161B22", border:`1px solid ${col}30`, borderTop:`3px solid ${col}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"20px 22px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:"50%", background:col+"22", border:`2px solid ${col}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:col, flexShrink:0 }}>{getInitials(mechanic.full_name)}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:"0.04em" }}>{mechanic.full_name}</div>
          <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
            {[{label:"Active",count:active.length,color:"#3B82F6"},{label:"Pending",count:pending.length,color:"#F59E0B"},{label:"Done",count:done.length,color:"#10B981"}].map(s=>(
              <span key={s.label} style={{ fontSize:12, color:s.color, background:s.color+"15", border:`1px solid ${s.color}30`, borderRadius:10, padding:"2px 10px", fontWeight:700 }}>{s.count} {s.label}</span>
            ))}
          </div>
        </div>
        {active.length>0&&<div style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.3)", borderRadius:8, padding:"6px 12px", textAlign:"center" }}><div style={{ fontSize:11, color:"#6E7681" }}>ON JOB</div><div style={{ fontSize:22, fontWeight:700, color:"#3B82F6", lineHeight:1.2 }}>{active.length}</div></div>}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>
        {orders.length===0?(<div style={{ padding:"24px 22px", textAlign:"center", color:"#484f58", fontSize:15 }}>No orders assigned</div>):orders.map(o=>{
          const days=daysOnLot(o.date_received);
          return(
            <div key={o.id} style={{ padding:"12px 22px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:14, background:o.status==="In Progress"?"rgba(59,130,246,0.04)":"transparent" }}>
              <div style={{ width:4, alignSelf:"stretch", borderRadius:2, background:o.status==="Pending"?"#F59E0B":o.status==="In Progress"?"#3B82F6":"#10B981", flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"#F59E0B", fontWeight:600 }}>{o.order_number}</span>
                  <span style={{ fontSize:15, fontWeight:700 }}>{o.customer}</span>
                  {o.color&&<span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#8B949E" }}><ColorDot color={o.color} size={10}/> {o.color}</span>}
                </div>
                <div style={{ fontSize:14, color:"#8B949E", marginBottom:4 }}>{o.year} {o.make} {o.model}</div>
                <div style={{ display:"flex", gap:14, marginBottom:4, flexWrap:"wrap", alignItems:"center" }}>
                  {o.date_received&&<span style={{ fontSize:11, color:"#6E7681" }}>📥 {fmtDate(o.date_received)}</span>}
                  {o.date_assigned&&<span style={{ fontSize:11, color:"#6E7681" }}>🔧 {fmtDate(o.date_assigned)}</span>}
                  {days!==null&&<span style={{ fontSize:12, fontWeight:700, color:lotColor(days) }}>{days}d on lot {days>=30?"⚠":""}</span>}
                </div>
                <div style={{ fontSize:13, color:"#C9D1D9", lineHeight:1.45, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{o.task}</div>
              </div>
              <div style={{ flexShrink:0 }}><TVStatusPill status={o.status}/></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TVDisplay() {
  const [mechanics, setMechanics] = useState([]); const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [lastUpdate, setLastUpdate] = useState(new Date());
  const load = async () => {
    const [{data:mechs},{data:ords}] = await Promise.all([
      supabase.from("profiles").select("*").eq("role","mechanic").order("full_name"),
      supabase.from("work_orders").select("*").neq("status","Completed").order("created_at",{ascending:false}),
    ]);
    setMechanics(mechs??[]); setOrders(ords??[]); setLastUpdate(new Date()); setLoading(false);
  };
  useEffect(()=>{ load(); const i=setInterval(load,60000); return ()=>clearInterval(i); },[]);
  useEffect(()=>{ const ch=supabase.channel("tv-rt").on("postgres_changes",{event:"*",schema:"public",table:"work_orders"},load).on("postgres_changes",{event:"*",schema:"public",table:"profiles"},load).subscribe(); return ()=>supabase.removeChannel(ch); },[]);
  const getOrdersForMech=id=>orders.filter(o=>o.mechanic_id===id);
  const totalActive=orders.filter(o=>o.status==="In Progress").length;
  const totalPending=orders.filter(o=>o.status==="Pending").length;
  const longOnLot=orders.filter(o=>daysOnLot(o.date_received)>=30).length;
  const cols=mechanics.length<=2?mechanics.length:mechanics.length<=4?2:3;
  if(loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0D1117", flexDirection:"column", gap:20 }}><div style={{ width:48, height:48, border:"3px solid rgba(245,158,11,0.2)", borderTop:"3px solid #F59E0B", borderRadius:"50%", animation:"spin .7s linear infinite" }}/><div style={{ color:"#6E7681", fontSize:18 }}>LOADING DISPLAY…</div></div>;
  return (
    <div style={{ minHeight:"100vh", background:"#0D1117", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"16px 28px", background:"#161B22", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:48, height:48, background:"rgba(245,158,11,0.1)", border:"1.5px solid rgba(245,158,11,0.3)", borderRadius:12 }}>
            <svg width="26" height="26" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div><div style={{ fontSize:24, fontWeight:700 }}>GARAGE<span style={{ color:"#F59E0B" }}>OPS</span></div><div style={{ fontSize:11, color:"#6E7681" }}>WORKSHOP FLOOR DISPLAY</div></div>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          {[{label:"MECHANICS",value:mechanics.length,color:"#E6EDF3"},{label:"IN PROGRESS",value:totalActive,color:"#3B82F6"},{label:"PENDING",value:totalPending,color:"#F59E0B"},{label:"30+ DAYS",value:longOnLot,color:longOnLot>0?"#EF4444":"#555d65"}].map(s=>(
            <div key={s.label} style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"8px 16px", textAlign:"center", minWidth:80 }}><div style={{ fontSize:10, color:"#6E7681", marginBottom:4 }}>{s.label}</div><div style={{ fontSize:26, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div></div>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:20, padding:"6px 14px" }}><span style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", animation:"pulse 1.5s ease-in-out infinite" }}/><span style={{ fontSize:12, fontWeight:700, color:"#10B981" }}>LIVE</span></div>
        </div>
        <TVClock/>
      </div>
      <div style={{ flex:1, padding:"20px 24px", overflowY:"auto" }}>
        {mechanics.length===0?(<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:16, color:"#484f58" }}><div style={{ fontSize:56 }}>👷</div><div style={{ fontSize:22, fontWeight:600 }}>No mechanics registered yet</div></div>):(
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:16, alignItems:"start" }}>
            {mechanics.map(m=><TVMechanicCard key={m.id} mechanic={m} orders={getOrdersForMech(m.id)}/>)}
          </div>
        )}
      </div>
      <div style={{ height:36, background:"#161B22", borderTop:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", display:"flex", alignItems:"center", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:16, flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.08)", paddingRight:16, height:"100%" }}><span style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", animation:"pulse 1.5s ease-in-out infinite" }}/><span style={{ fontSize:11, fontWeight:700, color:"#10B981" }}>LIVE</span></div>
        <div style={{ overflow:"hidden", flex:1, position:"relative", height:"100%", display:"flex", alignItems:"center" }}>
          <div style={{ whiteSpace:"nowrap", animation:"ticker 40s linear infinite", fontSize:13, color:"#8B949E" }}>
            {orders.length===0?"  No active work orders  ·  ":orders.map(o=>{const d=daysOnLot(o.date_received);return `  ${o.order_number} · ${o.customer} · ${o.year}${o.color?" "+o.color:""} ${o.make} ${o.model} · ${o.status}${d!==null?" · "+d+"d on lot":""}  ·`;}).join("  ")}
          </div>
        </div>
        <div style={{ paddingRight:16, paddingLeft:16, fontSize:11, color:"#484f58", borderLeft:"1px solid rgba(255,255,255,0.08)", height:"100%", display:"flex", alignItems:"center", flexShrink:0 }}>Updated {lastUpdate.toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGING PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function MessagingPanel({ currentUser, mechanics }) {
  const [selectedMech, setSelectedMech] = useState(null); const [messages, setMessages] = useState([]); const [allMessages, setAllMessages] = useState([]); const [body, setBody] = useState(""); const [sending, setSending] = useState(false); const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const isManager = currentUser.role === "manager";

  const loadAllMessages = async () => { const { data } = await supabase.from("messages").select("*"); setAllMessages(data??[]); };
  useEffect(() => { loadAllMessages(); }, []);

  const loadConversation = async (mechId) => {
    setLoading(true);
    let query = supabase.from("messages").select("*").order("created_at",{ascending:true});
    if (isManager) query=query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${mechId}),and(sender_id.eq.${mechId},receiver_id.eq.${currentUser.id})`);
    else query=query.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
    const { data } = await query;
    setMessages(data??[]); setLoading(false);
    const unreadIds=(data??[]).filter(m=>m.receiver_id===currentUser.id&&!m.is_read).map(m=>m.id);
    if (unreadIds.length>0) { await supabase.from("messages").update({is_read:true}).in("id",unreadIds); loadAllMessages(); }
  };

  useEffect(()=>{
    const channel=supabase.channel("messages-realtime").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
      const msg=payload.new;
      const isRelevant=isManager?selectedMech&&((msg.sender_id===currentUser.id&&msg.receiver_id===selectedMech.id)||(msg.sender_id===selectedMech.id&&msg.receiver_id===currentUser.id)):(msg.sender_id===currentUser.id||msg.receiver_id===currentUser.id);
      if(isRelevant){setMessages(prev=>[...prev,msg]);if(msg.receiver_id===currentUser.id)supabase.from("messages").update({is_read:true}).eq("id",msg.id);}
      loadAllMessages();
    }).subscribe();
    return ()=>supabase.removeChannel(channel);
  },[selectedMech,currentUser.id]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const handleSelectMech=(mech)=>{ setSelectedMech(mech); setMessages([]); loadConversation(mech.id); };
  const handleSend=async()=>{
    if(!body.trim()||sending) return; if(isManager&&!selectedMech) return; setSending(true);
    const receiverId=isManager?selectedMech.id:messages.find(m=>m.sender_id!==currentUser.id)?.sender_id??null;
    if(!receiverId){setSending(false);return;}
    await supabase.from("messages").insert({sender_id:currentUser.id,receiver_id:receiverId,body:body.trim()});
    setBody(""); setSending(false);
  };

  const unreadCount=(mechId)=>allMessages.filter(m=>m.sender_id===mechId&&m.receiver_id===currentUser.id&&!m.is_read).length;
  const totalUnread=allMessages.filter(m=>m.receiver_id===currentUser.id&&!m.is_read).length;
  const sidebarItems=isManager?mechanics:[{id:"manager",full_name:"Manager"}];

  // On mobile, show either sidebar or chat
  const [mobileView, setMobileView] = useState("sidebar"); // "sidebar" | "chat"
  const handleMobileSelect = (mech) => { handleSelectMech(mech); setMobileView("chat"); };

  return (
    <div style={{ display:"flex", gap:0, height:"calc(100vh - 160px)", minHeight:400, background:"#161B22", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, overflow:"hidden" }} className="msg-layout">

      {/* Sidebar — hidden on mobile when chat is open */}
      <div className="msg-sidebar" style={{ display: mobileView === "chat" ? "none" : "flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6E7681", letterSpacing:"0.1em" }}>{isManager?"MECHANICS":"INBOX"}</div>
          {!isManager&&totalUnread>0&&<div style={{ fontSize:12, color:"#F59E0B", marginTop:4 }}>{totalUnread} unread</div>}
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {sidebarItems.map(m=>{
            const unread=isManager?unreadCount(m.id):totalUnread;
            const isActive=selectedMech?.id===m.id;
            return(
              <div key={m.id} onClick={()=>handleMobileSelect(m)} style={{ padding:"14px 16px", cursor:"pointer", background:isActive?"rgba(245,158,11,0.07)":"transparent", borderLeft:isActive?"3px solid #F59E0B":"3px solid transparent", display:"flex", alignItems:"center", gap:12, transition:"background .1s", minHeight:60 }}>
                <div style={{ position:"relative" }}><Avatar name={m.full_name} size={40}/>{unread>0&&<div style={{ position:"absolute", top:-4, right:-4, background:"#EF4444", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", border:"2px solid #161B22" }}>{unread>9?"9+":unread}</div>}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.full_name}</div>
                  {unread>0&&<div style={{ fontSize:12, color:"#EF4444", marginTop:1 }}>{unread} unread</div>}
                </div>
                <div style={{ color:"#555d65", fontSize:18 }}>›</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, display: mobileView === "sidebar" && window.innerWidth < 900 ? "none" : "flex", flexDirection:"column", minWidth:0 }}>
        {!selectedMech?(
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:"#484f58" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#30363D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div style={{ fontSize:14 }}>{isManager?"Select a mechanic to message":"Select a conversation"}</div>
          </div>
        ):(
          <>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:10 }}>
              {/* Back button on mobile */}
              <button onClick={()=>setMobileView("sidebar")} style={{ background:"none", border:"none", color:"#8B949E", fontSize:22, cursor:"pointer", padding:"0 4px", display:"flex", alignItems:"center" }}>‹</button>
              <Avatar name={selectedMech.full_name} size={36}/>
              <div><div style={{ fontSize:15, fontWeight:700 }}>{selectedMech.full_name}</div><div style={{ fontSize:11, color:"#6E7681" }}>{isManager?"Mechanic":"Manager"}</div></div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 10px", display:"flex", flexDirection:"column", gap:10 }}>
              {loading?(<div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, gap:10, color:"#8B949E" }}><Spinner/>Loading…</div>)
                :messages.length===0?<div style={{ textAlign:"center", color:"#484f58", fontSize:13, marginTop:40 }}>No messages yet. Say hello!</div>
                :messages.map(msg=>{
                  const isMine=msg.sender_id===currentUser.id;
                  return(
                    <div key={msg.id} className="pop-in" style={{ display:"flex", flexDirection:"column", alignItems:isMine?"flex-end":"flex-start" }}>
                      <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius:isMine?"16px 16px 4px 16px":"16px 16px 16px 4px", background:isMine?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.06)", border:isMine?"1px solid rgba(245,158,11,0.25)":"1px solid rgba(255,255,255,0.08)", fontSize:15, lineHeight:1.55, color:"#E6EDF3", wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{msg.body}</div>
                      <div style={{ fontSize:11, color:"#555d65", marginTop:3, display:"flex", alignItems:"center", gap:5 }}>{timeAgo(msg.created_at)}{isMine&&<span style={{ color:msg.is_read?"#10B981":"#555d65" }}>{msg.is_read?"✓✓":"✓"}</span>}</div>
                    </div>
                  );
                })}
              <div ref={bottomRef}/>
            </div>
            <div style={{ padding:"10px 12px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:8, alignItems:"flex-end" }}>
              <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="Type a message…" rows={2} style={{ flex:1, fontSize:15, padding:"10px 12px", minHeight:50, maxHeight:100 }}/>
              <button onClick={handleSend} disabled={sending||!body.trim()} style={{ width:48, height:50, borderRadius:10, background:"#F59E0B", border:"none", color:"#0D1117", fontSize:20, cursor:sending||!body.trim()?"not-allowed":"pointer", opacity:sending||!body.trim()?.5:1, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>
                {sending?<Spinner size={16}/>:"↑"}
              </button>
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
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if(!email||!password) return; setLoading(true); setError("");
    try {
      const {data,error:ae}=await supabase.auth.signInWithPassword({email,password});
      if(ae){setError(ae.message);setLoading(false);return;}
      const {data:profile,error:pe}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if(pe){setError("Could not load your profile.");setLoading(false);return;}
      onLogin({...data.user,...profile});
    } catch{setError("Unexpected error.");setLoading(false);}
  };
  const demo=[{label:"Manager",email:"manager@garage.com",pass:"garage123",color:"#F59E0B"},{label:"Mechanic",email:"mike@garage.com",pass:"wrench1",color:"#3B82F6"},{label:"Mechanic",email:"sarah@garage.com",pass:"tools2",color:"#10B981"},{label:"Mechanic",email:"carlos@garage.com",pass:"motor3",color:"#8B5CF6"}];
  return (
    <div style={{ minHeight:"100vh", minHeight:"-webkit-fill-available", display:"flex", alignItems:"center", justifyContent:"center", background:"radial-gradient(ellipse at 50% 0%, #1a1200 0%, #0D1117 60%)", padding:16 }}>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", backgroundImage:"radial-gradient(circle, rgba(245,158,11,0.045) 1px, transparent 1px)", backgroundSize:"28px 28px" }}/>
      <div className="slide-in" style={{ width:"100%", maxWidth:420, background:"#161B22", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, overflow:"hidden", boxShadow:"0 32px 100px rgba(0,0,0,0.6)" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,transparent,#F59E0B 30%,#D97706 70%,transparent)" }}/>
        <div style={{ padding:"32px 24px 28px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, background:"radial-gradient(circle,rgba(245,158,11,0.15) 0%,rgba(245,158,11,0.04) 100%)", border:"1.5px solid rgba(245,158,11,0.35)", borderRadius:16, marginBottom:14 }}>
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontSize:28, fontWeight:700, letterSpacing:"0.1em" }}>GARAGE<span style={{ color:"#F59E0B" }}>OPS</span></div>
            <div style={{ fontSize:12, color:"#6E7681", marginTop:4, letterSpacing:"0.1em" }}>WORK ORDER MANAGEMENT</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><FieldLabel>EMAIL</FieldLabel><input type="email" value={email} autoComplete="email" onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="your@email.com" style={{ fontSize:16 }}/></div>
            <div><FieldLabel>PASSWORD</FieldLabel><input type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password" style={{ fontSize:16 }}/></div>
            <ErrBanner msg={error}/>
            <Btn variant="primary" onClick={handleLogin} disabled={loading||!email||!password} style={{ width:"100%", padding:"14px", fontSize:16, marginTop:4 }}>
              {loading?<><Spinner size={16}/>AUTHENTICATING…</>:"SIGN IN  →"}
            </Btn>
          </div>
          <div style={{ marginTop:20, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#555d65", letterSpacing:"0.12em", marginBottom:8 }}>DEMO CREDENTIALS</div>
            {demo.map(d=>(<div key={d.email} onClick={()=>{setEmail(d.email);setPassword(d.pass);}} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize:10, fontWeight:700, color:d.color, background:d.color+"18", border:`1px solid ${d.color}35`, borderRadius:4, padding:"2px 8px", minWidth:64, textAlign:"center" }}>{d.label.toUpperCase()}</span>
              <span style={{ color:"#8B949E", fontSize:13, fontFamily:"monospace" }}>{d.email}</span>
            </div>))}
            <div style={{ fontSize:11, color:"#484f58", marginTop:8 }}>Tap to auto-fill</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP NAV — mobile compact
// ═══════════════════════════════════════════════════════════════════════════════

function TopNav({ user, onLogout, unreadCount = 0, onTVOpen }) {
  return (
    <div style={{ height:54, background:"#161B22", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", padding:"0 14px", gap:10, position:"sticky", top:0, zIndex:50 }}>
      <svg width="20" height="20" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <span style={{ fontWeight:700, fontSize:15, letterSpacing:"0.07em" }}>GARAGE<span style={{ color:"#F59E0B" }}>OPS</span></span>
      <div style={{ background:user.role==="manager"?"rgba(245,158,11,0.1)":"rgba(59,130,246,0.1)", color:user.role==="manager"?"#F59E0B":"#3B82F6", border:`1px solid ${user.role==="manager"?"rgba(245,158,11,0.3)":"rgba(59,130,246,0.3)"}`, borderRadius:20, padding:"2px 8px", fontSize:9, fontWeight:700, letterSpacing:"0.1em" }}>{user.role.toUpperCase()}</div>
      <div style={{ flex:1 }}/>
      {unreadCount>0&&<div style={{ background:"#EF4444", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>{unreadCount>9?"9+":unreadCount}</div>}
      {user.role==="manager"&&onTVOpen&&<button onClick={onTVOpen} style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.3)", color:"#8B5CF6", borderRadius:8, padding:"6px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", minHeight:36 }}>📺 TV</button>}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Avatar name={user.full_name} size={28}/>
        <button onClick={onLogout} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", color:"#8B949E", borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, minHeight:32, touchAction:"manipulation" }}>OUT</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

function StatsCards({ orders }) {
  const t=orders.length,p=orders.filter(o=>o.status==="Pending").length,ip=orders.filter(o=>o.status==="In Progress").length,c=orders.filter(o=>o.status==="Completed").length;
  const longLot=orders.filter(o=>daysOnLot(o.date_received)>=30).length;
  return (
    <div className="stats-grid" style={{ display:"grid", gap:10, marginBottom:16 }}>
      {[{label:"TOTAL",value:t,color:"#E6EDF3"},{label:"PENDING",value:p,color:"#F59E0B"},{label:"ACTIVE",value:ip,color:"#3B82F6"},{label:"DONE",value:c,color:"#10B981"},{label:"30+ DAYS",value:longLot,color:longLot>0?"#EF4444":"#555d65"}].map(card=>(
        <div key={card.label} style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:"14px 12px" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#6E7681", letterSpacing:"0.1em", marginBottom:6 }}>{card.label}</div>
          <div style={{ fontSize:28, fontWeight:700, color:card.color, lineHeight:1 }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER MODAL — full screen on mobile
// ═══════════════════════════════════════════════════════════════════════════════

const BLANK_ORDER = { customer:"", make:"Toyota", model:"", year:currentYear, vin:"", color:"", task:"", mechanic_id:"", status:"Pending", date_received:"", date_assigned:"" };

function OrderModal({ mode, order, mechanics, onSave, onClose, saving }) {
  const [form, setForm] = useState(mode==="edit"?{...BLANK_ORDER,...order,mechanic_id:order.mechanic_id??"",color:order.color??"",date_received:order.date_received??"",date_assigned:order.date_assigned??""}:{...BLANK_ORDER});
  const [errs, setErrs] = useState({});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const validate=()=>{ const e={}; if(!form.customer.trim())e.customer="Required"; if(!form.model.trim())e.model="Required"; if(!form.vin.trim())e.vin="Required"; else if(form.vin.trim().length!==17)e.vin="Must be 17 characters"; if(!form.task.trim())e.task="Required"; return e; };
  const handleSave=()=>{ const e=validate(); if(Object.keys(e).length){setErrs(e);return;} onSave({...form,vin:form.vin.toUpperCase().trim(),year:parseInt(form.year),mechanic_id:form.mechanic_id||null,color:form.color||null,date_received:form.date_received||null,date_assigned:form.date_assigned||null}); };
  const days=daysOnLot(form.date_received);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200, backdropFilter:"blur(3px)" }}>
      <div className="slide-up" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:660, maxHeight:"95vh", overflow:"auto", paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, margin:"12px auto 0", flexShrink:0 }}/>
        <div style={{ padding:"12px 20px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:"0.05em" }}>{mode==="create"?"NEW WORK ORDER":`EDIT — ${order.order_number}`}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6E7681", fontSize:28, cursor:"pointer", lineHeight:1, padding:"0 4px", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#484f58", letterSpacing:"0.12em" }}>CUSTOMER</div>
            <div><FieldLabel required>Customer Name</FieldLabel><input value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="Full name"/><FieldErr msg={errs.customer}/></div>

            <div style={{ fontSize:10, fontWeight:700, color:"#484f58", letterSpacing:"0.12em", marginTop:4 }}>VEHICLE DETAILS</div>
            <div className="modal-grid" style={{ display:"grid", gap:12 }}>
              <div><FieldLabel required>Make</FieldLabel><select value={form.make} onChange={e=>set("make",e.target.value)}>{MAKES.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><FieldLabel required>Model</FieldLabel><input value={form.model} onChange={e=>set("model",e.target.value)} placeholder="e.g. Camry"/><FieldErr msg={errs.model}/></div>
              <div><FieldLabel>Year</FieldLabel><select value={form.year} onChange={e=>set("year",e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></div>
              <div><FieldLabel>Color</FieldLabel><div style={{ display:"flex", alignItems:"center", gap:8 }}><select value={form.color} onChange={e=>set("color",e.target.value)} style={{ flex:1 }}><option value="">— Select color —</option>{VEHICLE_COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select>{form.color&&<ColorDot color={form.color} size={22}/>}</div></div>
            </div>
            <div><FieldLabel required>VIN (17 characters)</FieldLabel><input value={form.vin} onChange={e=>set("vin",e.target.value.toUpperCase())} placeholder="1HGCM82633A123456" maxLength={17} style={{ fontFamily:"monospace", fontSize:14, letterSpacing:"0.06em" }}/><div style={{ fontSize:11, color:form.vin.length===17?"#10B981":"#6E7681", marginTop:4 }}>{form.vin.length}/17 chars</div><FieldErr msg={errs.vin}/></div>

            <div style={{ fontSize:10, fontWeight:700, color:"#484f58", letterSpacing:"0.12em", marginTop:4 }}>DATES</div>
            <div className="modal-grid" style={{ display:"grid", gap:12 }}>
              <div><FieldLabel>Date Received in Inventory</FieldLabel><input type="date" value={form.date_received} onChange={e=>set("date_received",e.target.value)}/></div>
              <div><FieldLabel>Date Assigned to Mechanic</FieldLabel><input type="date" value={form.date_assigned} onChange={e=>set("date_assigned",e.target.value)}/></div>
            </div>

            {form.date_received&&(
              <div style={{ background:days>=30?"rgba(239,68,68,0.07)":days>=14?"rgba(245,158,11,0.07)":"rgba(16,185,129,0.07)", border:`1px solid ${lotColor(days)}30`, borderRadius:8, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:36, fontWeight:700, color:lotColor(days), lineHeight:1, fontFamily:"monospace" }}>{days}</div>
                <div><div style={{ fontSize:14, fontWeight:600, color:lotColor(days) }}>days on lot {days>=30?"⚠":""}</div><div style={{ fontSize:11, color:"#6E7681", marginTop:2 }}>{lotLabel(days)} · Auto-calculated</div></div>
              </div>
            )}

            <div style={{ fontSize:10, fontWeight:700, color:"#484f58", letterSpacing:"0.12em", marginTop:4 }}>ASSIGNMENT</div>
            <div className="modal-grid" style={{ display:"grid", gap:12 }}>
              <div><FieldLabel>Assign Mechanic</FieldLabel><select value={form.mechanic_id} onChange={e=>set("mechanic_id",e.target.value)}><option value="">— Unassigned —</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
              <div><FieldLabel>Status</FieldLabel><select value={form.status} onChange={e=>set("status",e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>

            <div style={{ fontSize:10, fontWeight:700, color:"#484f58", letterSpacing:"0.12em", marginTop:4 }}>TASK</div>
            <div><FieldLabel required>Task Description</FieldLabel><textarea value={form.task} onChange={e=>set("task",e.target.value)} placeholder="Describe the work to be performed..." rows={4} style={{ resize:"vertical", minHeight:90 }}/><FieldErr msg={errs.task}/></div>
          </div>
        </div>
        <div style={{ padding:"12px 20px 20px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{ flex:1 }}>CANCEL</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving} style={{ flex:2 }}>{saving?<><Spinner size={14}/>SAVING…</>:mode==="create"?"CREATE ORDER":"SAVE CHANGES"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM MODALS
// ═══════════════════════════════════════════════════════════════════════════════

function ConfirmModal({ icon, title, body, confirmLabel, confirmVariant = "danger", onConfirm, onClose, loading }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200, backdropFilter:"blur(3px)" }}>
      <div className="slide-up" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:480, padding:"20px 20px 28px", paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>{title}</div>
        <div style={{ color:"#8B949E", fontSize:14, lineHeight:1.7, marginBottom:20 }}>{body}</div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={loading} style={{ flex:1 }}>CANCEL</Btn>
          <Btn variant={confirmVariant} onClick={onConfirm} disabled={loading} style={{ flex:2 }}>{loading?<><Spinner size={14}/>WORKING…</>:confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD MECHANIC MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function AddMechanicModal({ onClose, onCreated }) {
  const [form, setForm] = useState({name:"",email:"",password:"",confirm:""}); const [errs, setErrs] = useState({}); const [saving, setSaving] = useState(false); const [apiErr, setApiErr] = useState(""); const [success, setSuccess] = useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const validate=()=>{ const e={}; if(!form.name.trim())e.name="Required"; if(!form.email.trim())e.email="Required"; if(!form.password)e.password="Required"; else if(form.password.length<6)e.password="Min 6 chars"; if(form.confirm!==form.password)e.confirm="Passwords do not match"; return e; };
  const handleCreate=async()=>{
    const e=validate(); if(Object.keys(e).length){setErrs(e);return;}
    setSaving(true); setApiErr(""); setSuccess("");
    const {data,error:se}=await authClient.auth.signUp({email:form.email.trim().toLowerCase(),password:form.password});
    if(se){setApiErr(se.message);setSaving(false);return;}
    const newId=data.user?.id; if(!newId){setApiErr("ID not returned.");setSaving(false);return;}
    await authClient.auth.signOut();
    const {error:pe}=await supabase.from("profiles").insert({id:newId,full_name:form.name.trim(),initials:getInitials(form.name),role:"mechanic"});
    if(pe){setApiErr(pe.message);setSaving(false);return;}
    setSuccess(`Account created! ${form.name} can now log in.`); setSaving(false); onCreated(); setTimeout(()=>{setSuccess("");onClose();},3000);
  };
  return(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200, backdropFilter:"blur(3px)" }}>
      <div className="slide-up" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:480, paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, margin:"12px auto 0" }}/>
        <div style={{ padding:"12px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:16, fontWeight:700 }}>ADD MECHANIC</div>
          <button onClick={onClose} disabled={saving} style={{ background:"none", border:"none", color:"#6E7681", fontSize:28, cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div><FieldLabel required>Full Name</FieldLabel><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. James Carter"/><FieldErr msg={errs.name}/></div>
          <div><FieldLabel required>Email</FieldLabel><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="mechanic@garage.com"/><FieldErr msg={errs.email}/></div>
          <div><FieldLabel required>Password</FieldLabel><input type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Minimum 6 characters"/><FieldErr msg={errs.password}/></div>
          <div><FieldLabel required>Confirm Password</FieldLabel><input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Re-enter password"/><FieldErr msg={errs.confirm}/></div>
          <ErrBanner msg={apiErr}/><SuccessBanner msg={success}/>
        </div>
        <div style={{ padding:"0 20px 20px", display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{ flex:1 }}>CANCEL</Btn>
          <Btn variant="green" onClick={handleCreate} disabled={saving} style={{ flex:2 }}>{saving?<><Spinner size={14}/>CREATING…</>:"CREATE ACCOUNT"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDERS — mobile card list + desktop table
// ═══════════════════════════════════════════════════════════════════════════════

function OrderCard({ o, mechName, onEdit, onDelete }) {
  return (
    <div className="slide-in" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:16, marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div>
          <span style={{ fontFamily:"monospace", fontSize:13, color:"#F59E0B", fontWeight:600 }}>{o.order_number}</span>
          <div style={{ fontSize:16, fontWeight:700, marginTop:2 }}>{o.customer}</div>
        </div>
        <StatusBadge status={o.status}/>
      </div>
      <div style={{ fontSize:13, color:"#8B949E", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
        {o.year} {o.make} {o.model}
        {o.color&&<><ColorDot color={o.color} size={10}/><span>{o.color}</span></>}
      </div>
      <div style={{ fontFamily:"monospace", fontSize:11, color:"#555d65", marginBottom:8 }}>{o.vin}</div>
      {(o.date_received||o.date_assigned)&&(
        <div style={{ display:"flex", gap:12, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
          {o.date_received&&<span style={{ fontSize:12, color:"#6E7681" }}>📥 {fmtDate(o.date_received)}</span>}
          {daysOnLot(o.date_received)!==null&&<span style={{ fontSize:12, fontWeight:700, color:lotColor(daysOnLot(o.date_received)) }}>{daysOnLot(o.date_received)}d on lot {daysOnLot(o.date_received)>=30?"⚠":""}</span>}
          {o.date_assigned&&<span style={{ fontSize:12, color:"#6E7681" }}>🔧 {fmtDate(o.date_assigned)}</span>}
        </div>
      )}
      <div style={{ fontSize:13, color:"#C9D1D9", lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{o.task}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#6E7681" }}>{mechName(o.mechanic_id)}</span>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="blue" onClick={()=>onEdit(o)} style={{ padding:"6px 14px", fontSize:12 }}>EDIT</Btn>
          <Btn variant="red"  onClick={()=>onDelete(o)} style={{ padding:"6px 14px", fontSize:12 }}>DEL</Btn>
        </div>
      </div>
    </div>
  );
}

function WorkOrderTable({ orders, mechanics, onEdit, onDelete, onCreate, loading }) {
  const [search, setSearch] = useState(""); const [filterStatus, setFilterStatus] = useState("All"); const [sortField, setSortField] = useState("created_at"); const [sortDir, setSortDir] = useState("desc");
  const toggleSort=field=>{ if(sortField===field)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortField(field);setSortDir("asc");} };
  const mechName=id=>mechanics.find(m=>m.id===id)?.full_name??"Unassigned";
  const filtered=orders.filter(o=>{ const q=search.toLowerCase(); const mq=!q||[o.order_number,o.customer,o.make,o.model,o.vin,o.color].some(v=>(v??"").toLowerCase().includes(q)); return mq&&(filterStatus==="All"||o.status===filterStatus); }).sort((a,b)=>{ let va=a[sortField]??"",vb=b[sortField]??""; if(typeof va==="string")va=va.toLowerCase(); if(typeof vb==="string")vb=vb.toLowerCase(); return sortDir==="asc"?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0); });
  const TH=({label,field})=>(<th onClick={field?()=>toggleSort(field):undefined} style={{ padding:"10px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#6E7681", letterSpacing:"0.1em", whiteSpace:"nowrap", cursor:field?"pointer":"default", userSelect:"none" }} onMouseEnter={e=>{if(field)e.currentTarget.style.color="#8B949E";}} onMouseLeave={e=>{if(field)e.currentTarget.style.color="#6E7681";}}>{label}{field&&<span style={{ marginLeft:4, color:sortField===field?"#F59E0B":"#404953" }}>{sortField===field?(sortDir==="asc"?"↑":"↓"):"↕"}</span>}</th>);
  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ flex:1, minWidth:140 }}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ width:130 }}><option>All</option>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>
        <Btn variant="primary" onClick={onCreate} style={{ padding:"10px 16px" }}>+ NEW</Btn>
      </div>

      {loading?(<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:48, gap:12, color:"#8B949E" }}><Spinner/>Loading…</div>):(
        <>
          {/* Mobile card list */}
          <div className="card-list">
            {filtered.length===0?(<div style={{ padding:"40px 0", textAlign:"center", color:"#6E7681" }}><div style={{ fontSize:28, marginBottom:8 }}>🔍</div>No orders match</div>):
              filtered.map(o=><OrderCard key={o.id} o={o} mechName={mechName} onEdit={onEdit} onDelete={onDelete}/>)}
          </div>

          {/* Desktop table */}
          <div className="table-wrap" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1000 }}>
                <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}><TH label="ORDER #" field="order_number"/><TH label="CUSTOMER" field="customer"/><TH label="VEHICLE"/><TH label="COLOR"/><TH label="RECEIVED" field="date_received"/><TH label="LOT DAYS"/><TH label="ASSIGNED" field="date_assigned"/><TH label="MECHANIC"/><TH label="STATUS" field="status"/><TH label="ACTIONS"/></tr></thead>
                <tbody>
                  {filtered.length===0?(<tr><td colSpan={10} style={{ padding:"40px", textAlign:"center", color:"#6E7681" }}>No orders match</td></tr>):
                    filtered.map((o,i)=>(
                      <tr key={o.id} style={{ borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none", transition:"background .1s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.018)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"12px 12px" }}><span style={{ fontFamily:"monospace", fontSize:13, color:"#F59E0B", fontWeight:600 }}>{o.order_number}</span></td>
                        <td style={{ padding:"12px 12px" }}><div style={{ fontWeight:600 }}>{o.customer}</div></td>
                        <td style={{ padding:"12px 12px" }}><div style={{ fontSize:13, fontWeight:600 }}>{o.year} {o.make} {o.model}</div><div style={{ fontFamily:"monospace", fontSize:11, color:"#6E7681" }}>{o.vin}</div></td>
                        <td style={{ padding:"12px 12px" }}>{o.color?<div style={{ display:"flex", alignItems:"center", gap:6 }}><ColorDot color={o.color} size={11}/><span style={{ fontSize:13 }}>{o.color}</span></div>:<span style={{ color:"#484f58", fontSize:12 }}>—</span>}</td>
                        <td style={{ padding:"12px 12px" }}><span style={{ fontFamily:"monospace", fontSize:12, color:"#8B949E" }}>{fmtDate(o.date_received)}</span></td>
                        <td style={{ padding:"12px 12px" }}><LotBadge dateReceived={o.date_received}/></td>
                        <td style={{ padding:"12px 12px" }}><span style={{ fontFamily:"monospace", fontSize:12, color:"#8B949E" }}>{fmtDate(o.date_assigned)}</span></td>
                        <td style={{ padding:"12px 12px" }}><span style={{ fontSize:13, color:"#8B949E" }}>{mechName(o.mechanic_id)}</span></td>
                        <td style={{ padding:"12px 12px" }}><StatusBadge status={o.status}/></td>
                        <td style={{ padding:"12px 12px" }}><div style={{ display:"flex", gap:5 }}><Btn variant="blue" onClick={()=>onEdit(o)} style={{ padding:"4px 10px", fontSize:11 }}>EDIT</Btn><Btn variant="red" onClick={()=>onDelete(o)} style={{ padding:"4px 10px", fontSize:11 }}>DEL</Btn></div></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <div style={{ fontSize:12, color:"#555d65", marginTop:8 }}>{filtered.length} of {orders.length} orders</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANIC PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function MechanicsPanel({ mechanics, orders, onAdd, onDelete, loading }) {
  const cnt=(id,status)=>orders.filter(o=>o.mechanic_id===id&&(!status||o.status===status)).length;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ fontSize:14, color:"#8B949E" }}>{mechanics.length} mechanic{mechanics.length!==1?"s":""}</div>
        <Btn variant="green" onClick={onAdd} style={{ padding:"8px 16px" }}>+ ADD</Btn>
      </div>
      {loading?<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:48, gap:12, color:"#8B949E" }}><Spinner/>Loading…</div>
        :mechanics.length===0?(
          <div style={{ textAlign:"center", padding:"48px 20px", background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, color:"#6E7681" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>👷</div>
            <div style={{ fontSize:17, fontWeight:600, marginBottom:8 }}>No Mechanics Yet</div>
            <div style={{ marginTop:16 }}><Btn variant="green" onClick={onAdd}>+ ADD MECHANIC</Btn></div>
          </div>
        ):(
          <div className="mechanic-grid" style={{ display:"grid", gap:12 }}>
            {mechanics.map(m=>{
              const total=cnt(m.id),pending=cnt(m.id,"Pending"),inProg=cnt(m.id,"In Progress"),done=cnt(m.id,"Completed");
              return(
                <div key={m.id} style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"16px 16px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <Avatar name={m.full_name} size={42}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.full_name}</div>
                      <div style={{ fontSize:12, color:"#6E7681", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.email??"—"}</div>
                    </div>
                    <div style={{ background:"rgba(59,130,246,0.1)", color:"#3B82F6", border:"1px solid rgba(59,130,246,0.25)", borderRadius:20, padding:"2px 8px", fontSize:9, fontWeight:700, flexShrink:0 }}>MECH</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                    {[{label:"Total",value:total,color:"#E6EDF3"},{label:"Pend.",value:pending,color:"#F59E0B"},{label:"Active",value:inProg,color:"#3B82F6"},{label:"Done",value:done,color:"#10B981"}].map(s=>(
                      <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 4px", textAlign:"center" }}><div style={{ fontSize:20, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div><div style={{ fontSize:9, color:"#555d65", marginTop:3 }}>{s.label.toUpperCase()}</div></div>
                    ))}
                  </div>
                  <Btn variant="red" onClick={()=>onDelete(m)} style={{ width:"100%", padding:"8px", fontSize:12 }}>REMOVE ACCOUNT</Btn>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerDashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([]); const [mechanics, setMechanics] = useState([]); const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders"); const [modal, setModal] = useState(null); const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false); const [deleting, setDeleting] = useState(false); const [dbError, setDbError] = useState("");
  const [showAddMech, setShowAddMech] = useState(false); const [selectedMech, setSelectedMech] = useState(null); const [deletingMech, setDeletingMech] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const loadOrders    = async () => { const {data,error}=await supabase.from("work_orders").select("*").order("created_at",{ascending:false}); if(error)setDbError(error.message); else setOrders(data??[]); };
  const loadMechanics = async () => { const {data}=await supabase.from("profiles").select("*").eq("role","mechanic"); setMechanics(data??[]); };
  const loadUnread    = async () => { const {count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("receiver_id",user.id).eq("is_read",false); setUnreadTotal(count??0); };

  useEffect(()=>{ setLoading(true); Promise.all([loadOrders(),loadMechanics(),loadUnread()]).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ const ch=supabase.channel("mgr-unread").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`receiver_id=eq.${user.id}`},()=>loadUnread()).subscribe(); return()=>supabase.removeChannel(ch); },[]);

  const closeOrder=()=>{ setModal(null); setSelected(null); setSaving(false); setDeleting(false); };

  const handleSave=async(form)=>{
    setSaving(true); setDbError("");
    const payload={customer:form.customer,make:form.make,model:form.model,year:form.year,vin:form.vin,task:form.task,status:form.status,mechanic_id:form.mechanic_id||null,color:form.color||null,date_received:form.date_received||null,date_assigned:form.date_assigned||null};
    if(modal==="create"){const{error}=await supabase.from("work_orders").insert({...payload,created_by:user.id});if(error){setDbError(error.message);setSaving(false);return;}}
    else{const{error}=await supabase.from("work_orders").update({...payload,updated_at:todayStr()}).eq("id",form.id);if(error){setDbError(error.message);setSaving(false);return;}}
    await loadOrders(); closeOrder();
  };

  const handleDeleteOrder=async()=>{ setDeleting(true); setDbError(""); const{error}=await supabase.from("work_orders").delete().eq("id",selected.id); if(error){setDbError(error.message);setDeleting(false);return;} await loadOrders(); closeOrder(); };

  const handleDeleteMechanic=async()=>{
    setDeletingMech(true); setDbError("");
    await supabase.from("work_orders").update({mechanic_id:null,updated_at:todayStr()}).eq("mechanic_id",selectedMech.id);
    const{error}=await supabase.from("profiles").delete().eq("id",selectedMech.id);
    if(error){setDbError(error.message);setDeletingMech(false);return;}
    await Promise.all([loadOrders(),loadMechanics()]); setSelectedMech(null); setDeletingMech(false);
  };

  // Bottom tab bar for mobile
  const tabs = [
    { id:"orders",   label:"Orders",   icon:"📋", count:orders.length },
    { id:"team",     label:"Team",     icon:"👷", count:mechanics.length },
    { id:"messages", label:"Messages", icon:"💬", badge:unreadTotal },
  ];

  return (
    <div style={{ background:"#0D1117", minHeight:"100vh", paddingBottom:60 }}>
      <TopNav user={user} onLogout={onLogout} unreadCount={unreadTotal} onTVOpen={()=>window.open(window.location.origin+"?tv=1","_blank")}/>

      <div className="page-pad" style={{ maxWidth:1600, margin:"0 auto" }}>
        {/* Desktop tab bar */}
        <div style={{ borderBottom:"1px solid rgba(255,255,255,0.06)", marginBottom:20, marginTop:8, display:"none" }} className="desktop-tabs">
        </div>

        <ErrBanner msg={dbError}/>

        {activeTab==="orders"   && <><StatsCards orders={orders}/><WorkOrderTable orders={orders} mechanics={mechanics} loading={loading} onCreate={()=>setModal("create")} onEdit={o=>{setSelected(o);setModal("edit");}} onDelete={o=>{setSelected(o);setModal("delete");}}/></>}
        {activeTab==="team"     && <MechanicsPanel mechanics={mechanics} orders={orders} loading={loading} onAdd={()=>setShowAddMech(true)} onDelete={m=>setSelectedMech(m)}/>}
        {activeTab==="messages" && <MessagingPanel currentUser={user} mechanics={mechanics}/>}
      </div>

      {/* Mobile bottom tab bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#161B22", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", zIndex:40, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>{ setActiveTab(tab.id); if(tab.id==="messages")loadUnread(); }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, position:"relative", touchAction:"manipulation" }}>
            <span style={{ fontSize:20 }}>{tab.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.05em", color:activeTab===tab.id?"#F59E0B":"#6E7681" }}>{tab.label.toUpperCase()}</span>
            {tab.count>0&&<span style={{ position:"absolute", top:6, right:"calc(50% - 16px)", background:"rgba(255,255,255,0.1)", color:"#8B949E", borderRadius:10, padding:"0 5px", fontSize:9, fontWeight:700, minWidth:16, textAlign:"center" }}>{tab.count}</span>}
            {tab.badge>0&&<span style={{ position:"absolute", top:6, right:"calc(50% - 16px)", background:"#EF4444", color:"#fff", borderRadius:10, padding:"0 5px", fontSize:9, fontWeight:700, minWidth:16, textAlign:"center" }}>{tab.badge}</span>}
            {activeTab===tab.id&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:24, height:2, background:"#F59E0B", borderRadius:1 }}/>}
          </button>
        ))}
      </div>

      {(modal==="create"||modal==="edit")&&<OrderModal mode={modal} order={selected} mechanics={mechanics} onSave={handleSave} onClose={closeOrder} saving={saving}/>}
      {modal==="delete"&&<ConfirmModal title="Delete Work Order" body={<>Delete <strong style={{ color:"#F59E0B" }}>{selected?.order_number}</strong> for <strong style={{ color:"#E6EDF3" }}>{selected?.customer}</strong>? This cannot be undone.</>} confirmLabel="DELETE ORDER" onConfirm={handleDeleteOrder} onClose={closeOrder} loading={deleting}/>}
      {showAddMech&&<AddMechanicModal onClose={()=>setShowAddMech(false)} onCreated={()=>loadMechanics()}/>}
      {selectedMech&&<ConfirmModal title="Remove Mechanic" body={<>Remove <strong style={{ color:"#E6EDF3" }}>{selectedMech.full_name}</strong>? {orders.filter(o=>o.mechanic_id===selectedMech.id).length>0&&<span style={{ color:"#D97706" }}>⚠ Their orders will be unassigned.</span>} This cannot be undone.</>} confirmLabel="REMOVE MECHANIC" onConfirm={handleDeleteMechanic} onClose={()=>setSelectedMech(null)} loading={deletingMech}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANIC DASHBOARD — mobile optimized
// ═══════════════════════════════════════════════════════════════════════════════

function MechanicDashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [dbError, setDbError] = useState(""); const [activeTab, setActiveTab] = useState("orders"); const [unreadTotal, setUnreadTotal] = useState(0);
  const [managerProfile, setManagerProfile] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const loadOrders=async()=>{ setLoading(true); const{data,error}=await supabase.from("work_orders").select("*").eq("mechanic_id",user.id).order("created_at",{ascending:false}); if(error)setDbError(error.message); else setOrders(data??[]); setLoading(false); };
  const loadUnread=async()=>{ const{count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("receiver_id",user.id).eq("is_read",false); setUnreadTotal(count??0); };

  useEffect(()=>{ loadOrders(); loadUnread(); supabase.from("profiles").select("*").eq("role","manager").single().then(({data})=>setManagerProfile(data)); },[]);
  useEffect(()=>{ const ch=supabase.channel("mech-unread").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`receiver_id=eq.${user.id}`},()=>loadUnread()).subscribe(); return()=>supabase.removeChannel(ch); },[]);

  const handleStatus=async(id,status)=>{
    const{error}=await supabase.from("work_orders").update({status,updated_at:todayStr()}).eq("id",id);
    if(error){setDbError(error.message);return;}
    setOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));
    if(status==="Completed"){
      const order=orders.find(o=>o.id===id); if(!order) return;
      const{data:manager}=await supabase.from("profiles").select("id").eq("role","manager").single();
      if(!manager) return;
      const colorStr=order.color?` ${order.color}`:"";
      const days=daysOnLot(order.date_received);
      const dateStr=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      const body=`✅ Work order ${order.order_number} has been completed.\n\nCustomer: ${order.customer}\nVehicle: ${order.year}${colorStr} ${order.make} ${order.model}\nVIN: ${order.vin}\n${days!==null?`Days on lot: ${days}\n`:""}Completed by: ${user.full_name}\nDate: ${dateStr}`;
      await supabase.from("messages").insert({sender_id:user.id,receiver_id:manager.id,body});
    }
  };

  const filteredOrders = filterStatus === "All" ? orders : orders.filter(o => o.status === filterStatus);
  const statusCounts = { All: orders.length, Pending: orders.filter(o=>o.status==="Pending").length, "In Progress": orders.filter(o=>o.status==="In Progress").length, Completed: orders.filter(o=>o.status==="Completed").length };

  const tabs = [
    { id:"orders",   label:"My Orders", icon:"🔧" },
    { id:"messages", label:"Messages",  icon:"💬", badge:unreadTotal },
  ];

  return (
    <div style={{ background:"#0D1117", minHeight:"100vh", paddingBottom:60 }}>
      <TopNav user={user} onLogout={onLogout} unreadCount={unreadTotal}/>

      <div className="page-pad" style={{ maxWidth:900, margin:"0 auto" }}>
        <ErrBanner msg={dbError}/>

        {activeTab==="orders"&&(
          <>
            {/* Status filter pills — touch-friendly */}
            <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:"touch" }}>
              {["All","Pending","In Progress","Completed"].map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)} style={{ flexShrink:0, background:filterStatus===s?(s==="All"?"rgba(255,255,255,0.12)":s==="Pending"?"rgba(245,158,11,0.2)":s==="In Progress"?"rgba(59,130,246,0.2)":"rgba(16,185,129,0.2)"):"rgba(255,255,255,0.05)", color:filterStatus===s?(s==="All"?"#E6EDF3":s==="Pending"?"#F59E0B":s==="In Progress"?"#3B82F6":"#10B981"):"#6E7681", border:`1px solid ${filterStatus===s?(s==="All"?"rgba(255,255,255,0.2)":s==="Pending"?"rgba(245,158,11,0.4)":s==="In Progress"?"rgba(59,130,246,0.4)":"rgba(16,185,129,0.4)"):"rgba(255,255,255,0.08)"}`, borderRadius:20, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", minHeight:38, touchAction:"manipulation" }}>
                  {s} {statusCounts[s]>0&&<span style={{ marginLeft:5, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"0 6px", fontSize:11 }}>{statusCounts[s]}</span>}
                </button>
              ))}
            </div>

            {loading?(<div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:64, gap:12, color:"#8B949E" }}><Spinner/>Loading your orders…</div>)
              :filteredOrders.length===0?(<div style={{ textAlign:"center", padding:"60px 20px", background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, color:"#6E7681" }}><div style={{ fontSize:44, marginBottom:12 }}>🔧</div><div style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>{orders.length===0?"No Orders Assigned":"No Orders Here"}</div><div style={{ fontSize:13 }}>{orders.length===0?"Your manager hasn't assigned any orders yet.":"Try a different filter above."}</div></div>)
              :filteredOrders.map(o=>{
                const m=STATUS_META[o.status]??STATUS_META["Pending"];
                const days=daysOnLot(o.date_received);
                return(
                  <div key={o.id} className="slide-in" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.06)", borderLeft:`4px solid ${m.color}`, borderRadius:12, padding:16, marginBottom:12 }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <span style={{ fontFamily:"monospace", fontSize:13, color:"#F59E0B", fontWeight:600 }}>{o.order_number}</span>
                        <div style={{ fontSize:17, fontWeight:700, marginTop:2 }}>{o.customer}</div>
                      </div>
                      <StatusBadge status={o.status} large/>
                    </div>

                    {/* Vehicle */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#8B949E", marginBottom:6 }}>
                      <span>{o.year} {o.make} {o.model}</span>
                      {o.color&&<><ColorDot color={o.color} size={12}/><span>{o.color}</span></>}
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:"#555d65", marginBottom:8 }}>{o.vin}</div>

                    {/* Dates & lot days */}
                    {(o.date_received||o.date_assigned)&&(
                      <div style={{ display:"flex", gap:12, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
                        {o.date_received&&<span style={{ fontSize:12, color:"#6E7681" }}>📥 {fmtDate(o.date_received)}</span>}
                        {days!==null&&<span style={{ fontSize:12, fontWeight:700, color:lotColor(days) }}>· {days}d on lot {days>=30?"⚠":""}</span>}
                        {o.date_assigned&&<span style={{ fontSize:12, color:"#6E7681" }}>🔧 {fmtDate(o.date_assigned)}</span>}
                      </div>
                    )}

                    {/* Task */}
                    <div style={{ fontSize:14, color:"#C9D1D9", lineHeight:1.55, borderLeft:"2px solid rgba(245,158,11,0.25)", padding:"10px 12px", marginBottom:14, background:"rgba(255,255,255,0.02)", borderRadius:"0 8px 8px 0" }}>{o.task}</div>

                    {/* Status selector — large, touch friendly */}
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:"#6E7681", letterSpacing:"0.1em", marginBottom:8 }}>
                        UPDATE STATUS {o.status!=="Completed"&&<span style={{ color:"#484f58", fontWeight:400 }}>· manager auto-notified on completion</span>}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        {STATUS_OPTIONS.map(s=>(
                          <button key={s} onClick={()=>handleStatus(o.id,s)} style={{ flex:1, padding:"11px 6px", borderRadius:10, border:`2px solid ${o.status===s?(s==="Pending"?"#F59E0B":s==="In Progress"?"#3B82F6":"#10B981"):"rgba(255,255,255,0.08)"}`, background:o.status===s?(s==="Pending"?"rgba(245,158,11,0.15)":s==="In Progress"?"rgba(59,130,246,0.15)":"rgba(16,185,129,0.15)"):"rgba(255,255,255,0.03)", color:o.status===s?(s==="Pending"?"#F59E0B":s==="In Progress"?"#3B82F6":"#10B981"):"#6E7681", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", letterSpacing:"0.04em", touchAction:"manipulation", transition:"all .15s" }}>
                            {s==="Pending"?"Pending":s==="In Progress"?"Active":"Done"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        )}

        {activeTab==="messages"&&<MessagingPanel currentUser={user} mechanics={managerProfile?[managerProfile]:[]}/>}
      </div>

      {/* Mobile bottom tab bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#161B22", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", zIndex:40, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>{ setActiveTab(tab.id); if(tab.id==="messages")loadUnread(); }} style={{ flex:1, background:"none", border:"none", cursor:"pointer", padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, position:"relative", touchAction:"manipulation" }}>
            <span style={{ fontSize:22 }}>{tab.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:activeTab===tab.id?"#3B82F6":"#6E7681" }}>{tab.label.toUpperCase()}</span>
            {tab.badge>0&&<span style={{ position:"absolute", top:6, right:"calc(50% - 16px)", background:"#EF4444", color:"#fff", borderRadius:10, padding:"0 5px", fontSize:9, fontWeight:700, minWidth:16, textAlign:"center" }}>{tab.badge}</span>}
            {activeTab===tab.id&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:24, height:2, background:"#3B82F6", borderRadius:1 }}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [user, setUser] = useState(null); const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(()=>{ const el=document.createElement("style"); el.textContent=GLOBAL_CSS; document.head.appendChild(el); return()=>document.head.removeChild(el); },[]);

  const isTVMode=new URLSearchParams(window.location.search).get("tv")==="1";
  if(isTVMode) return <TVDisplay/>;

  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const{data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();if(p)setUser({...session.user,...p});}
      setCheckingAuth(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_OUT"){setUser(null);return;}
      if(session?.user){const{data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();if(p)setUser({...session.user,...p});}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const handleLogout=async()=>{ await supabase.auth.signOut(); setUser(null); };

  if(checkingAuth) return(
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0D1117" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <div style={{ width:36, height:36, border:"3px solid rgba(245,158,11,0.2)", borderTop:"3px solid #F59E0B", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
        <div style={{ color:"#6E7681", fontSize:14, letterSpacing:"0.06em" }}>LOADING…</div>
      </div>
    </div>
  );

  if(!user) return <LoginScreen onLogin={setUser}/>;
  if(user.role==="manager") return <ManagerDashboard user={user} onLogout={handleLogout}/>;
  return <MechanicDashboard user={user} onLogout={handleLogout}/>;
}
