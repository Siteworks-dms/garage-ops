import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";


const STATUS_OPTIONS = ["Pending", "In Progress", "Completed"];
const STATUS_META = {
  "Pending":     { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  "In Progress": { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  "Completed":   { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
};
const VEHICLE_COLORS = ["Black","White","Silver","Gray","Red","Blue","Green","Brown","Beige","Orange","Yellow","Gold","Purple","Maroon","Navy","Champagne","Other"];
const MAKES = ["Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jeep","Kia","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const MECHANIC_COLORS = [
  { label:"Ocean Blue",   value:"#3B82F6" },
  { label:"Purple",       value:"#8B5CF6" },
  { label:"Emerald",      value:"#10B981" },
  { label:"Amber",        value:"#F59E0B" },
  { label:"Red",          value:"#EF4444" },
  { label:"Pink",         value:"#EC4899" },
  { label:"Cyan",         value:"#06B6D4" },
  { label:"Orange",       value:"#F97316" },
  { label:"Lime",         value:"#84CC16" },
  { label:"Indigo",       value:"#6366F1" },
  { label:"Rose",         value:"#F43F5E" },
  { label:"Teal",         value:"#14B8A6" },
];

// Get a mechanic's color — use stored color or fall back to hash-based palette
function getMechColor(mechanic) {
  if (mechanic?.color) return mechanic.color;
  const palette = MECHANIC_COLORS.map(c => c.value);
  return palette[(mechanic?.full_name?.charCodeAt(0) || 0) % palette.length];
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{-webkit-text-size-adjust:100%;}
  body{background:#0D1117;color:#E6EDF3;font-family:'Rajdhani',system-ui,sans-serif;font-size:15px;line-height:1.5;min-height:100vh;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#30363D;border-radius:2px;}
  input,select,textarea{background:#0D1117;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#E6EDF3;font-family:'Rajdhani',sans-serif;font-size:16px;padding:10px 14px;width:100%;outline:none;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none;min-height:44px;}
  input[type="date"]{color-scheme:dark;}
  input:focus,select:focus,textarea:focus{border-color:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,0.08);}
  select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236E7681' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px;}
  select option{background:#1C2333;}
  textarea{resize:none;min-height:80px;}
  .mono{font-family:'JetBrains Mono',monospace!important;}
  @keyframes slideIn{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes popIn{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes ticker{0%{transform:translateX(100vw);}100%{transform:translateX(-100%);}}
  .slide-in{animation:slideIn .2s ease forwards;}
  .slide-up{animation:slideUp .2s ease forwards;}
  .pop-in{animation:popIn .15s ease forwards;}
  .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
  .kanban-grid{grid-template-columns:1fr!important;}
  .modal-grid{grid-template-columns:1fr!important;}
  .mechanic-grid{grid-template-columns:1fr!important;}
  .msg-layout{flex-direction:column!important;}
  .msg-sidebar{width:100%!important;max-height:160px!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,0.07)!important;}
  .hide-mobile{display:none!important;}
  .page-pad{padding:14px 14px!important;}
  .table-wrap{display:none!important;}
  .card-list{display:block!important;}
  @media(min-width:600px){.hide-mobile{display:flex!important;}.page-pad{padding:20px 20px!important;}.stats-grid{grid-template-columns:repeat(3,1fr)!important;}}
  @media(min-width:900px){.stats-grid{grid-template-columns:repeat(5,1fr)!important;}.kanban-grid{grid-template-columns:repeat(3,1fr)!important;}.modal-grid{grid-template-columns:1fr 1fr!important;}.mechanic-grid{grid-template-columns:repeat(3,1fr)!important;}.msg-layout{flex-direction:row!important;}.msg-sidebar{width:260px!important;max-height:none!important;border-right:1px solid rgba(255,255,255,0.07)!important;border-bottom:none!important;}.page-pad{padding:28px 24px!important;}.table-wrap{display:block!important;}.card-list{display:none!important;}}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

const todayStr    = () => new Date().toISOString();
const currentYear = new Date().getFullYear();
const years       = Array.from({ length: 32 }, (_, i) => currentYear + 1 - i);
function getInitials(n=""){return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);}
function timeAgo(ts){const d=Date.now()-new Date(ts).getTime(),m=Math.floor(d/60000);if(m<1)return"just now";if(m<60)return`${m}m ago`;const h=Math.floor(m/60);if(h<24)return`${h}h ago`;return new Date(ts).toLocaleDateString();}
function fmtDate(d){if(!d)return"—";return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function daysOnLot(dr){if(!dr)return null;const r=new Date(dr+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);const d=Math.floor((t-r)/86400000);return d<0?0:d;}
function lotColor(d){if(d===null)return"#6E7681";if(d>=30)return"#EF4444";if(d>=14)return"#F59E0B";return"#10B981";}
function lotLabel(d){if(d===null)return"";if(d>=30)return"⚠ Over 30 days";if(d>=14)return"Getting long";return"Recent";}

// Username helpers
function usernameToEmail(u){return`garageops.${u.toLowerCase().trim()}@gmail.com`;}
function isValidUsername(u){return/^[a-zA-Z0-9_-]{3,20}$/.test(u);}

const COLOR_MAP={Black:"#1a1a1a",White:"#f0f0f0",Silver:"#C0C0C0",Gray:"#808080",Red:"#DC2626",Blue:"#2563EB",Green:"#16A34A",Brown:"#92400E",Beige:"#D4B896",Orange:"#EA580C",Yellow:"#CA8A04",Gold:"#B7960C",Purple:"#7C3AED",Maroon:"#881337",Navy:"#1E3A5F",Champagne:"#C9A96E",Other:"#6E7681"};
function ColorDot({color,size=12}){if(!color)return null;const hex=COLOR_MAP[color]??"#6E7681",nb=["White","Beige","Champagne"].includes(color);return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:hex,border:nb?"1px solid rgba(255,255,255,0.2)":"none",flexShrink:0,verticalAlign:"middle"}}/>;}
function LotBadge({dateReceived}){const d=daysOnLot(dateReceived);if(d===null)return<span style={{color:"#484f58",fontSize:12}}>—</span>;const c=lotColor(d);return<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:15,fontWeight:700,color:c,lineHeight:1}}>{d}</span><span style={{fontSize:11,color:"#555d65"}}>days</span>{d>=30&&<span style={{fontSize:11,color:"#EF4444"}}>⚠</span>}</div>;}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Spinner({size=20}){return<div style={{width:size,height:size,border:"2px solid rgba(245,158,11,0.2)",borderTop:"2px solid #F59E0B",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block",flexShrink:0}}/>;}

function StatusBadge({status,large=false}){const m=STATUS_META[status]??STATUS_META["Pending"];return<span style={{background:m.bg,color:m.color,border:`1px solid ${m.border}`,borderRadius:20,padding:large?"5px 14px":"3px 11px",fontSize:large?14:12,fontWeight:700,letterSpacing:"0.03em",whiteSpace:"nowrap",fontFamily:"'Rajdhani',sans-serif",display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:large?8:6,height:large?8:6,borderRadius:"50%",background:m.color,flexShrink:0}}/>{status}</span>;}

function Avatar({name="",size=36,color=null}){const i=getInitials(name),p=["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"],c=color||(p[(name.charCodeAt(0)||0)%p.length]);return<div style={{width:size,height:size,borderRadius:"50%",background:c+"22",border:`1.5px solid ${c}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*.36),fontWeight:700,color:c,flexShrink:0,letterSpacing:"0.05em",userSelect:"none"}}>{i}</div>;}

function Btn({children,variant="ghost",onClick,disabled,style:sx={}}){const V={primary:{background:"#F59E0B",color:"#0D1117",border:"none"},danger:{background:"#EF4444",color:"#fff",border:"none"},blue:{background:"rgba(59,130,246,0.12)",color:"#3B82F6",border:"1px solid rgba(59,130,246,0.3)"},red:{background:"rgba(239,68,68,0.12)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.3)"},ghost:{background:"transparent",color:"#8B949E",border:"1px solid rgba(255,255,255,0.1)"},green:{background:"rgba(16,185,129,0.12)",color:"#10B981",border:"1px solid rgba(16,185,129,0.3)"},purple:{background:"rgba(139,92,246,0.12)",color:"#8B5CF6",border:"1px solid rgba(139,92,246,0.3)"}};return<button onClick={onClick} disabled={disabled} style={{...V[variant],borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,letterSpacing:"0.06em",transition:"opacity .15s,filter .15s",fontFamily:"'Rajdhani',sans-serif",whiteSpace:"nowrap",minHeight:44,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,touchAction:"manipulation",...sx}} onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.1)";}} onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>{children}</button>;}

function FieldLabel({children,required}){return<label style={{display:"block",fontSize:11,fontWeight:700,color:"#8B949E",letterSpacing:"0.09em",marginBottom:6}}>{children}{required&&<span style={{color:"#F59E0B",marginLeft:3}}>*</span>}</label>;}
function FieldErr({msg}){return msg?<div style={{fontSize:12,color:"#F87171",marginTop:4}}>{msg}</div>:null;}
function ErrBanner({msg}){return msg?<div style={{background:"rgba(239,68,68,0.09)",border:"1px solid rgba(239,68,68,0.28)",color:"#F87171",borderRadius:8,padding:"10px 14px",fontSize:13,lineHeight:1.5,marginTop:8}}>{msg}</div>:null;}
function SuccessBanner({msg}){return msg?<div style={{background:"rgba(16,185,129,0.09)",border:"1px solid rgba(16,185,129,0.28)",color:"#34D399",borderRadius:8,padding:"10px 14px",fontSize:13,lineHeight:1.5,marginTop:8}}>{msg}</div>:null;}

// ── TV Display ─────────────────────────────────────────────────────────────────

function TVClock(){const[t,setT]=useState(new Date());useEffect(()=>{const x=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(x);},[]);const p=n=>String(n).padStart(2,"0");return<div style={{textAlign:"right"}}><div style={{fontSize:42,fontWeight:700,letterSpacing:"0.06em",lineHeight:1,color:"#E6EDF3",fontFamily:"'JetBrains Mono',monospace"}}>{p(t.getHours())}:{p(t.getMinutes())}:{p(t.getSeconds())}</div><div style={{fontSize:14,color:"#6E7681",marginTop:4}}>{t.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div></div>;}

function TVStatusPill({status}){const m={Pending:{color:"#F59E0B",bg:"rgba(245,158,11,0.15)"},"In Progress":{color:"#3B82F6",bg:"rgba(59,130,246,0.15)"},Completed:{color:"#10B981",bg:"rgba(16,185,129,0.15)"}}[status]??{color:"#F59E0B",bg:"rgba(245,158,11,0.15)"};return<span style={{display:"inline-flex",alignItems:"center",gap:6,background:m.bg,color:m.color,borderRadius:20,padding:"4px 12px",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:m.color,display:"inline-block",...(status==="In Progress"?{animation:"pulse 1.5s ease-in-out infinite"}:{})}}/>{status}</span>;}

function TVMechanicCard({mechanic,orders}){
  const c=getMechColor(mechanic);
  const active=orders.filter(o=>o.status==="In Progress"),pending=orders.filter(o=>o.status==="Pending"),done=orders.filter(o=>o.status==="Completed");
  return(
    <div style={{background:"#161B22",border:`1px solid ${c}30`,borderTop:`3px solid ${c}`,borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"20px 22px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:c+"22",border:`2px solid ${c}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:c,flexShrink:0}}>{getInitials(mechanic.full_name)}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:700}}>{mechanic.full_name}</div>
          {mechanic.username&&<div style={{fontSize:13,color:"#6E7681",fontFamily:"monospace"}}>@{mechanic.username}</div>}
          <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
            {[{label:"Active",count:active.length,color:"#3B82F6"},{label:"Pending",count:pending.length,color:"#F59E0B"},{label:"Done",count:done.length,color:"#10B981"}].map(s=><span key={s.label} style={{fontSize:12,color:s.color,background:s.color+"15",border:`1px solid ${s.color}30`,borderRadius:10,padding:"2px 10px",fontWeight:700}}>{s.count} {s.label}</span>)}
          </div>
        </div>
        {active.length>0&&<div style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:8,padding:"6px 12px",textAlign:"center"}}><div style={{fontSize:11,color:"#6E7681"}}>ON JOB</div><div style={{fontSize:22,fontWeight:700,color:"#3B82F6",lineHeight:1.2}}>{active.length}</div></div>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 0"}}>
        {orders.length===0?<div style={{padding:"24px 22px",textAlign:"center",color:"#484f58",fontSize:15}}>No orders assigned</div>:orders.map(o=>{
          const days=daysOnLot(o.date_received);
          return(<div key={o.id} style={{padding:"12px 22px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",gap:14,background:o.status==="In Progress"?"rgba(59,130,246,0.04)":"transparent"}}>
            <div style={{width:4,alignSelf:"stretch",borderRadius:2,background:o.status==="Pending"?"#F59E0B":o.status==="In Progress"?"#3B82F6":"#10B981",flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontFamily:"monospace",fontSize:13,color:"#F59E0B",fontWeight:600}}>{o.order_number}</span>
                <span style={{fontSize:15,fontWeight:700}}>{o.customer}</span>
                {o.color&&<span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:"#8B949E"}}><ColorDot color={o.color} size={10}/> {o.color}</span>}
              </div>
              <div style={{fontSize:14,color:"#8B949E",marginBottom:4}}>{o.year} {o.make} {o.model}</div>
              <div style={{display:"flex",gap:14,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                {o.date_received&&<span style={{fontSize:11,color:"#6E7681"}}>📥 {fmtDate(o.date_received)}</span>}
                {o.date_assigned&&<span style={{fontSize:11,color:"#6E7681"}}>🔧 {fmtDate(o.date_assigned)}</span>}
                {days!==null&&<span style={{fontSize:12,fontWeight:700,color:lotColor(days)}}>{days}d on lot {days>=30?"⚠":""}</span>}
              </div>
              <div style={{fontSize:13,color:"#C9D1D9",lineHeight:1.45,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{o.task}</div>
            </div>
            <div style={{flexShrink:0}}><TVStatusPill status={o.status}/></div>
          </div>);
        })}
      </div>
    </div>
  );
}


// ── TV PIN Lock ────────────────────────────────────────────────────────────────

function TVPinPrompt({ onUnlock }) {
  const [pin, setPin]       = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const attempt = async () => {
    if (pin.length < 4) return;
    setLoading(true); setError("");
    const { data } = await supabase.from("profiles").select("tv_pin").eq("role", "manager").single();
    if (!data?.tv_pin) {
      // No PIN set — allow through
      onUnlock(); return;
    }
    if (pin === data.tv_pin) {
      onUnlock();
    } else {
      setError("Incorrect PIN. Try again.");
      setPin(""); setLoading(false);
      setTimeout(() => setError(""), 2500);
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === "Enter") attempt(); };

  const pad = [1,2,3,4,5,6,7,8,9,null,0,"⌫"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(13,17,23,0.97)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(8px)" }}>
      <div style={{ background:"#161B22", border:"1px solid rgba(245,158,11,0.25)", borderRadius:20, padding:"36px 32px 32px", width:"100%", maxWidth:340, textAlign:"center", boxShadow:"0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(245,158,11,0.1)", border:"2px solid rgba(245,158,11,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:26 }}>🔒</div>
        <div style={{ fontSize:20, fontWeight:700, letterSpacing:"0.06em", marginBottom:6 }}>MANAGER ACCESS</div>
        <div style={{ fontSize:13, color:"#6E7681", marginBottom:24 }}>Enter PIN to exit TV display</div>

        {/* PIN dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:24 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:16, height:16, borderRadius:"50%", background: i < pin.length ? "#F59E0B" : "rgba(255,255,255,0.1)", border:"1.5px solid rgba(245,158,11,0.3)", transition:"background .15s" }}/>
          ))}
        </div>

        {/* Numpad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          {pad.map((k, i) => k === null ? (
            <div key={i}/>
          ) : (
            <button key={i}
              onClick={() => {
                if (k === "⌫") { setPin(p => p.slice(0,-1)); setError(""); }
                else if (pin.length < 4) { const np = pin + k; setPin(np); if (np.length === 4) setTimeout(() => attempt(), 100); }
              }}
              style={{ background: k === "⌫" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: k === "⌫" ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"16px 8px", fontSize: k === "⌫" ? 18 : 20, fontWeight:700, color: k === "⌫" ? "#EF4444" : "#E6EDF3", cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", touchAction:"manipulation", transition:"background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = k === "⌫" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = k === "⌫" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)"}
            >{k}</button>
          ))}
        </div>

        {error && <div style={{ fontSize:13, color:"#F87171", fontWeight:600, marginBottom:8 }}>{error}</div>}
        {loading && <div style={{ fontSize:12, color:"#6E7681" }}>Checking…</div>}
        <div style={{ fontSize:11, color:"#484f58", marginTop:8 }}>Contact your manager if you forgot the PIN</div>
      </div>
    </div>
  );
}

function TVDisplay(){
  const[mechanics,setMechanics]=useState([]);const[orders,setOrders]=useState([]);const[loading,setLoading]=useState(true);const[lastUpdate,setLastUpdate]=useState(new Date());
  const[showPinPrompt,setShowPinPrompt]=useState(false);
  const[pinUnlocked,setPinUnlocked]=useState(false);

  // Block all navigation attempts on TV
  useEffect(()=>{
    // Block back button
    window.history.pushState(null,"",window.location.href);
    const onPop=()=>{
      window.history.pushState(null,"",window.location.href);
      setShowPinPrompt(true);
    };
    window.addEventListener("popstate",onPop);

    // Block keyboard shortcuts that navigate away (Alt+Left, F5, etc.)
    const onKey=e=>{
      const blocked=
        (e.altKey&&e.key==="ArrowLeft")||   // back
        (e.altKey&&e.key==="ArrowRight")||  // forward
        (e.key==="F5")||                    // refresh
        (e.ctrlKey&&e.key==="r")||          // ctrl+R
        (e.metaKey&&e.key==="r");           // cmd+R
      if(blocked){e.preventDefault();setShowPinPrompt(true);}
    };
    window.addEventListener("keydown",onKey);

    // Block right-click context menu
    const onCtx=e=>e.preventDefault();
    window.addEventListener("contextmenu",onCtx);

    return()=>{
      window.removeEventListener("popstate",onPop);
      window.removeEventListener("keydown",onKey);
      window.removeEventListener("contextmenu",onCtx);
    };
  },[]);

  // After PIN unlock — redirect to main app
  const handleUnlock=()=>{
    setPinUnlocked(true);
    setShowPinPrompt(false);
    window.location.href=window.location.origin;
  };
  const load=async()=>{const[{data:m},{data:o}]=await Promise.all([supabase.from("profiles").select("*").eq("role","mechanic").order("full_name"),supabase.from("work_orders").select("*").neq("status","Completed").order("created_at",{ascending:false})]);setMechanics(m??[]);setOrders(o??[]);setLastUpdate(new Date());setLoading(false);};
  useEffect(()=>{load();const i=setInterval(load,60000);return()=>clearInterval(i);},[]);
  useEffect(()=>{const ch=supabase.channel("tv-rt").on("postgres_changes",{event:"*",schema:"public",table:"work_orders"},load).on("postgres_changes",{event:"*",schema:"public",table:"profiles"},load).subscribe();return()=>supabase.removeChannel(ch);},[]);
  const getO=id=>orders.filter(o=>o.mechanic_id===id);
  const tA=orders.filter(o=>o.status==="In Progress").length,tP=orders.filter(o=>o.status==="Pending").length,tL=orders.filter(o=>daysOnLot(o.date_received)>=30).length;
  const cols=mechanics.length<=2?mechanics.length:mechanics.length<=4?2:3;
  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0D1117",flexDirection:"column",gap:20}}><div style={{width:48,height:48,border:"3px solid rgba(245,158,11,0.2)",borderTop:"3px solid #F59E0B",borderRadius:"50%",animation:"spin .7s linear infinite"}}/><div style={{color:"#6E7681",fontSize:18}}>LOADING…</div></div>;
  return(
    <div style={{minHeight:"100vh",background:"#0D1117",display:"flex",flexDirection:"column"}}>
      {showPinPrompt&&<TVPinPrompt onUnlock={handleUnlock}/>}
      <div style={{padding:"16px 28px",background:"#161B22",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:48,height:48,background:"rgba(245,158,11,0.1)",border:"1.5px solid rgba(245,158,11,0.3)",borderRadius:12}}>
            <svg width="26" height="26" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div><div style={{fontSize:24,fontWeight:700}}>GARAGE<span style={{color:"#F59E0B"}}>OPS</span></div><div style={{fontSize:11,color:"#6E7681"}}>WORKSHOP FLOOR DISPLAY</div></div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {[{label:"MECHANICS",value:mechanics.length,color:"#E6EDF3"},{label:"IN PROGRESS",value:tA,color:"#3B82F6"},{label:"PENDING",value:tP,color:"#F59E0B"},{label:"30+ DAYS",value:tL,color:tL>0?"#EF4444":"#555d65"}].map(s=><div key={s.label} style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:80}}><div style={{fontSize:10,color:"#6E7681",marginBottom:4}}>{s.label}</div><div style={{fontSize:26,fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</div></div>)}
          <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:20,padding:"6px 14px"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#10B981",animation:"pulse 1.5s ease-in-out infinite"}}/><span style={{fontSize:12,fontWeight:700,color:"#10B981"}}>LIVE</span></div>
        </div>
        <TVClock/>
      </div>
      <div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
        {mechanics.length===0?<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:16,color:"#484f58"}}><div style={{fontSize:56}}>👷</div><div style={{fontSize:22,fontWeight:600}}>No mechanics registered yet</div></div>:<div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:16,alignItems:"start"}}>{mechanics.map(m=><TVMechanicCard key={m.id} mechanic={m} orders={getO(m.id)}/>)}</div>}
      </div>
      <div style={{height:36,background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",display:"flex",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:16,flexShrink:0,borderRight:"1px solid rgba(255,255,255,0.08)",paddingRight:16,height:"100%"}}><span style={{width:6,height:6,borderRadius:"50%",background:"#10B981",animation:"pulse 1.5s ease-in-out infinite"}}/><span style={{fontSize:11,fontWeight:700,color:"#10B981"}}>LIVE</span></div>
        <div style={{overflow:"hidden",flex:1,position:"relative",height:"100%",display:"flex",alignItems:"center"}}><div style={{whiteSpace:"nowrap",animation:"ticker 40s linear infinite",fontSize:13,color:"#8B949E"}}>{orders.length===0?"  No active work orders  ·  ":orders.map(o=>{const d=daysOnLot(o.date_received);return`  ${o.order_number} · ${o.customer} · ${o.year}${o.color?" "+o.color:""} ${o.make} ${o.model} · ${o.status}${d!==null?" · "+d+"d on lot":""}  ·`;}).join("  ")}</div></div>
        <div style={{paddingRight:16,paddingLeft:16,fontSize:11,color:"#484f58",borderLeft:"1px solid rgba(255,255,255,0.08)",height:"100%",display:"flex",alignItems:"center",flexShrink:0}}>Updated {lastUpdate.toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────


// ── Forgot Password Modal ──────────────────────────────────────────────────────

function ForgotPasswordModal({ onClose }) {
  const [username, setUsername] = useState("");
  const [role,     setRole]     = useState(null); // null | "manager" | "mechanic"
  const [checking, setChecking] = useState(false);
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [msgType,  setMsgType]  = useState("success");
  const [done,     setDone]     = useState(false);

  const lookup = async () => {
    if (!username.trim()) return;
    setChecking(true); setMsg(""); setRole(null);
    const { data } = await supabase.from("profiles")
      .select("role, id").eq("username", username.toLowerCase().trim()).single();
    if (!data) { setMsg("Username not found."); setMsgType("error"); setChecking(false); return; }
    setRole(data.role);
    setChecking(false);
  };

  const resetManagerPassword = async () => {
    if (!newPass || newPass.length < 6) { setMsg("Password must be at least 6 characters."); setMsgType("error"); return; }
    if (newPass !== confirm) { setMsg("Passwords do not match."); setMsgType("error"); return; }
    setSaving(true); setMsg("");
    try {
      // Look up manager's auth email and id
      const { data: profile } = await supabase.from("profiles")
        .select("id, auth_email").eq("username", username.toLowerCase().trim()).single();
      if (!profile) { setMsg("Profile not found."); setMsgType("error"); setSaving(false); return; }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
      if (!serviceKey) { setMsg("Service key not configured. Contact your system administrator."); setMsgType("error"); setSaving(false); return; }

      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ password: newPass }),
      });
      if (!res.ok) { const d = await res.json(); setMsg(d.message || "Failed to reset password."); setMsgType("error"); setSaving(false); return; }
      setDone(true); setMsg("Password reset successfully! You can now log in with your new password."); setMsgType("success");
    } catch(e) { setMsg(e?.message ?? "Unexpected error."); setMsgType("error"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, zIndex:300, backdropFilter:"blur(4px)" }}>
      <div className="slide-in" style={{ background:"#161B22", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, width:"100%", maxWidth:400, overflow:"hidden" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,transparent,#3B82F6 30%,#06B6D4 70%,transparent)" }}/>
        <div style={{ padding:"28px 24px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:"0.06em" }}>FORGOT PASSWORD</div>
          </div>

          {!role ? (
            // Step 1 — enter username
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <FieldLabel>USERNAME</FieldLabel>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#555d65", fontSize:15, fontWeight:600, pointerEvents:"none" }}>@</span>
                  <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} onKeyDown={e=>e.key==="Enter"&&lookup()} placeholder="your_username" autoCapitalize="none" autoCorrect="off" style={{ paddingLeft:28 }}/>
                </div>
              </div>
              {msg && <div style={{ fontSize:13, color:msgType==="error"?"#F87171":"#34D399", fontWeight:600 }}>{msg}</div>}
              <Btn variant="blue" onClick={lookup} disabled={checking||!username.trim()} style={{ width:"100%" }}>
                {checking ? <><Spinner size={14}/>LOOKING UP…</> : "CONTINUE →"}
              </Btn>
            </div>
          ) : role === "mechanic" ? (
            // Mechanic — contact manager
            <div style={{ textAlign:"center" }}>
              <div style={{ background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:10, padding:"20px 16px", marginBottom:20 }}>
                <div style={{ fontSize:28, marginBottom:10 }}>👷</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:"#E6EDF3" }}>Contact Your Manager</div>
                <div style={{ fontSize:13, color:"#8B949E", lineHeight:1.7 }}>
                  As a mechanic, your password can only be reset by your manager.<br/>
                  Ask them to reset it from the <strong style={{ color:"#3B82F6" }}>Team tab</strong> in the Manager Dashboard.
                </div>
              </div>
            </div>
          ) : (
            // Manager — self-service reset via Admin API
            done ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#10B981", marginBottom:8 }}>Password Reset!</div>
                <div style={{ fontSize:13, color:"#8B949E", marginBottom:20 }}>{msg}</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#8B949E" }}>
                  Resetting password for <strong style={{ color:"#F59E0B" }}>@{username}</strong> (Manager)
                </div>
                <div>
                  <FieldLabel required>New Password</FieldLabel>
                  <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="At least 6 characters"/>
                </div>
                <div>
                  <FieldLabel required>Confirm New Password</FieldLabel>
                  <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&resetManagerPassword()} placeholder="Re-enter password"/>
                </div>
                {msg && <div style={{ fontSize:13, color:msgType==="error"?"#F87171":"#34D399", fontWeight:600 }}>{msg}</div>}
                <Btn variant="primary" onClick={resetManagerPassword} disabled={saving||!newPass||!confirm} style={{ width:"100%" }}>
                  {saving ? <><Spinner size={14}/>RESETTING…</> : "RESET PASSWORD"}
                </Btn>
              </div>
            )
          )}

          <div style={{ marginTop:16, textAlign:"center" }}>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#6E7681", fontSize:13, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif" }}>← Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({onLogin}){
  const[username,setUsername]=useState("");const[password,setPassword]=useState("");const[error,setError]=useState("");const[loading,setLoading]=useState(false);const[showForgot,setShowForgot]=useState(false);

  const handleLogin=async()=>{
    if(!username||!password)return;
    setLoading(true);setError("");
    try{
      // Look up the profile by username to get the internal auth email
      const{data:profiles,error:le}=await supabase.from("profiles").select("id,auth_email,full_name,role,username,initials").eq("username",username.toLowerCase().trim());
      if(le||!profiles||profiles.length===0){setError("Username not found. Check and try again.");setLoading(false);return;}
      const profile=profiles[0];
      if(!profile.auth_email){setError("Account not configured. Contact your manager.");setLoading(false);return;}
      const{data,error:ae}=await supabase.auth.signInWithPassword({email:profile.auth_email,password});
      if(ae){setError("Incorrect password. Please try again.");setLoading(false);return;}
      onLogin({...data.user,...profile});
    }catch{setError("Unexpected error. Please try again.");setLoading(false);}
  };



  return(<>
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(ellipse at 50% 0%,#1a1200 0%,#0D1117 60%)",padding:16}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",backgroundImage:"radial-gradient(circle,rgba(245,158,11,0.045) 1px,transparent 1px)",backgroundSize:"28px 28px"}}/>
      <div className="slide-in" style={{width:"100%",maxWidth:420,background:"#161B22",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,overflow:"hidden",boxShadow:"0 32px 100px rgba(0,0,0,0.6)"}}>
        <div style={{height:3,background:"linear-gradient(90deg,transparent,#F59E0B 30%,#D97706 70%,transparent)"}}/>
        <div style={{padding:"32px 24px 28px"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,background:"radial-gradient(circle,rgba(245,158,11,0.15) 0%,rgba(245,158,11,0.04) 100%)",border:"1.5px solid rgba(245,158,11,0.35)",borderRadius:16,marginBottom:14}}>
              <svg width="32" height="32" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{fontSize:28,fontWeight:700,letterSpacing:"0.1em"}}>GARAGE<span style={{color:"#F59E0B"}}>OPS</span></div>
            <div style={{fontSize:12,color:"#6E7681",marginTop:4,letterSpacing:"0.1em"}}>WORK ORDER MANAGEMENT</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <FieldLabel>USERNAME</FieldLabel>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#555d65",fontSize:15,fontWeight:600,pointerEvents:"none"}}>@</span>
                <input value={username} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" onChange={e=>setUsername(e.target.value.toLowerCase())} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="your_username" style={{paddingLeft:28}}/>
              </div>
            </div>
            <div>
              <FieldLabel>PASSWORD</FieldLabel>
              <input type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password"/>
            </div>
            <ErrBanner msg={error}/>
            <Btn variant="primary" onClick={handleLogin} disabled={loading||!username||!password} style={{width:"100%",padding:"14px",fontSize:16,marginTop:4}}>
              {loading?<><Spinner size={16}/>SIGNING IN…</>:"SIGN IN  →"}
            </Btn>
            <button onClick={()=>setShowForgot(true)} style={{background:"none",border:"none",color:"#6E7681",fontSize:13,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",padding:"4px 0",textAlign:"center",width:"100%",marginTop:4}}>
              Forgot password?
            </button>
          </div>

        </div>
      </div>
    </div>
    {showForgot&&<ForgotPasswordModal onClose={()=>setShowForgot(false)}/>}
  </>;
}


// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [msgType, setMsgType] = useState("success");

  const save = async () => {
    if (!current)             { setMsg("Enter your current password."); setMsgType("error"); return; }
    if (newPass.length < 6)   { setMsg("New password must be at least 6 characters."); setMsgType("error"); return; }
    if (newPass !== confirm)  { setMsg("New passwords do not match."); setMsgType("error"); return; }
    if (current === newPass)  { setMsg("New password must be different from current."); setMsgType("error"); return; }
    setSaving(true); setMsg("");
    try {
      // Re-authenticate first to verify current password
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile }  = await supabase.from("profiles").select("auth_email").eq("id", user.id).single();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: profile.auth_email, password: current });
      if (authErr) { setMsg("Current password is incorrect."); setMsgType("error"); setSaving(false); return; }

      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPass });
      if (updateErr) { setMsg(updateErr.message); setMsgType("error"); setSaving(false); return; }

      setMsg("✓ Password changed successfully!"); setMsgType("success");
      setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => onClose(), 2000);
    } catch(e) { setMsg(e?.message ?? "Unexpected error."); setMsgType("error"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div className="slide-up" style={{ background:"#1C2333", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:480, paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, margin:"12px auto 0" }}/>
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>CHANGE PASSWORD</div>
            <div style={{ fontSize:12, color:"#8B949E", marginTop:2 }}>Enter your current password to confirm</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6E7681", fontSize:28, cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel required>Current Password</FieldLabel>
            <input type="password" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Your current password" autoComplete="current-password"/>
          </div>
          <div>
            <FieldLabel required>New Password</FieldLabel>
            <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password"/>
          </div>
          <div>
            <FieldLabel required>Confirm New Password</FieldLabel>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="Re-enter new password" autoComplete="new-password"/>
          </div>
          {msg && (
            <div style={{ background:msgType==="success"?"rgba(16,185,129,0.09)":"rgba(239,68,68,0.09)", border:`1px solid ${msgType==="success"?"rgba(16,185,129,0.28)":"rgba(239,68,68,0.28)"}`, color:msgType==="success"?"#34D399":"#F87171", borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:600 }}>
              {msg}
            </div>
          )}
        </div>
        <div style={{ padding:"0 20px 20px", display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{ flex:1 }}>CANCEL</Btn>
          <Btn variant="primary" onClick={save} disabled={saving||!current||!newPass||!confirm} style={{ flex:2 }}>
            {saving ? <><Spinner size={14}/>SAVING…</> : "CHANGE PASSWORD"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Top Nav ────────────────────────────────────────────────────────────────────

function TopNav({user,onLogout,unreadCount=0,onTVOpen,onChangePassword}){
  return(
    <div style={{height:54,background:"#161B22",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",padding:"0 14px",gap:10,position:"sticky",top:0,zIndex:50}}>
      <svg width="20" height="20" viewBox="0 0 34 34" fill="none"><polygon points="17,3 31,10 31,24 17,31 3,24 3,10" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><circle cx="17" cy="17" r="4.5" stroke="#F59E0B" strokeWidth="1.5" fill="rgba(245,158,11,0.1)"/><line x1="17" y1="12.5" x2="17" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="17" y1="21.5" x2="17" y2="26" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="12.5" y1="17" x2="8" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/><line x1="21.5" y1="17" x2="26" y2="17" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>
      <span style={{fontWeight:700,fontSize:15,letterSpacing:"0.07em"}}>GARAGE<span style={{color:"#F59E0B"}}>OPS</span></span>
      <div style={{background:user.role==="manager"?"rgba(245,158,11,0.1)":"rgba(59,130,246,0.1)",color:user.role==="manager"?"#F59E0B":"#3B82F6",border:`1px solid ${user.role==="manager"?"rgba(245,158,11,0.3)":"rgba(59,130,246,0.3)"}`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,letterSpacing:"0.1em"}}>{user.role.toUpperCase()}</div>
      <div style={{flex:1}}/>
      {unreadCount>0&&<div style={{background:"#EF4444",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{unreadCount>9?"9+":unreadCount}</div>}
      {user.role==="manager"&&onTVOpen&&<button onClick={onTVOpen} style={{background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.3)",color:"#8B5CF6",borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",minHeight:36}}>📺 TV</button>}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Avatar name={user.full_name} size={28}/>
        <div style={{display:"flex",flexDirection:"column"}} className="hide-mobile">
          <span style={{fontSize:13,fontWeight:600,lineHeight:1.2}}>{user.full_name}</span>
          {user.username&&<span style={{fontSize:11,color:"#6E7681",fontFamily:"monospace"}}>@{user.username}</span>}
        </div>
        <button onClick={onChangePassword} style={{background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",color:"#3B82F6",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,minHeight:32,touchAction:"manipulation",whiteSpace:"nowrap"}}>🔑</button>
        <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"#8B949E",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,minHeight:32,touchAction:"manipulation"}}>OUT</button>
      </div>
    </div>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────────

function StatsCards({orders}){
  const t=orders.length,p=orders.filter(o=>o.status==="Pending").length,ip=orders.filter(o=>o.status==="In Progress").length,c=orders.filter(o=>o.status==="Completed").length,ll=orders.filter(o=>daysOnLot(o.date_received)>=30).length;
  return<div className="stats-grid" style={{display:"grid",gap:10,marginBottom:16}}>{[{label:"TOTAL",value:t,color:"#E6EDF3"},{label:"PENDING",value:p,color:"#F59E0B"},{label:"ACTIVE",value:ip,color:"#3B82F6"},{label:"DONE",value:c,color:"#10B981"},{label:"30+ DAYS",value:ll,color:ll>0?"#EF4444":"#555d65"}].map(card=><div key={card.label} style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"14px 12px"}}><div style={{fontSize:9,fontWeight:700,color:"#6E7681",letterSpacing:"0.1em",marginBottom:6}}>{card.label}</div><div style={{fontSize:28,fontWeight:700,color:card.color,lineHeight:1}}>{card.value}</div></div>)}</div>;
}

// ── Messaging ──────────────────────────────────────────────────────────────────

function MessagingPanel({currentUser,mechanics}){
  const[sel,setSel]=useState(null);const[msgs,setMsgs]=useState([]);const[allMsgs,setAllMsgs]=useState([]);const[body,setBody]=useState("");const[sending,setSending]=useState(false);const[loading,setLoading]=useState(false);const[mView,setMView]=useState("sidebar");
  const bot=useRef(null);const isM=currentUser.role==="manager";
  const loadAll=async()=>{const{data}=await supabase.from("messages").select("*");setAllMsgs(data??[]);};
  useEffect(()=>{loadAll();},[]);
  const loadConv=async(id)=>{
    setLoading(true);
    let q=supabase.from("messages").select("*").order("created_at",{ascending:true});
    if(isM)q=q.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`);
    else q=q.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
    const{data}=await q;setMsgs(data??[]);setLoading(false);
    const u=(data??[]).filter(m=>m.receiver_id===currentUser.id&&!m.is_read).map(m=>m.id);
    if(u.length>0){await supabase.from("messages").update({is_read:true}).in("id",u);loadAll();}
  };
  useEffect(()=>{
    const ch=supabase.channel("msg-rt").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},p=>{
      const m=p.new;const rel=isM?sel&&((m.sender_id===currentUser.id&&m.receiver_id===sel.id)||(m.sender_id===sel.id&&m.receiver_id===currentUser.id)):(m.sender_id===currentUser.id||m.receiver_id===currentUser.id);
      if(rel){setMsgs(prev=>[...prev,m]);if(m.receiver_id===currentUser.id)supabase.from("messages").update({is_read:true}).eq("id",m.id);}
      loadAll();
    }).subscribe();
    return()=>supabase.removeChannel(ch);
  },[sel,currentUser.id]);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const pick=m=>{setSel(m);setMsgs([]);loadConv(m.id);setMView("chat");};
  const send=async()=>{
    if(!body.trim()||sending)return;if(isM&&!sel)return;setSending(true);
    const rid=isM?sel.id:msgs.find(m=>m.sender_id!==currentUser.id)?.sender_id??null;
    if(!rid){setSending(false);return;}
    await supabase.from("messages").insert({sender_id:currentUser.id,receiver_id:rid,body:body.trim()});
    setBody("");setSending(false);
  };
  const uc=id=>allMsgs.filter(m=>m.sender_id===id&&m.receiver_id===currentUser.id&&!m.is_read).length;
  const tu=allMsgs.filter(m=>m.receiver_id===currentUser.id&&!m.is_read).length;
  const items=isM?mechanics:[{id:"manager",full_name:"Manager",username:"manager"}];
  return(
    <div style={{display:"flex",gap:0,height:"calc(100vh - 160px)",minHeight:400,background:"#161B22",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}} className="msg-layout">
      <div className="msg-sidebar" style={{display:mView==="chat"?"none":"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}><div style={{fontSize:11,fontWeight:700,color:"#6E7681",letterSpacing:"0.1em"}}>{isM?"MECHANICS":"INBOX"}</div>{!isM&&tu>0&&<div style={{fontSize:12,color:"#F59E0B",marginTop:4}}>{tu} unread</div>}</div>
        <div style={{flex:1,overflowY:"auto"}}>
          {items.map(m=>{const u=isM?uc(m.id):tu,ia=sel?.id===m.id;return(
            <div key={m.id} onClick={()=>pick(m)} style={{padding:"14px 16px",cursor:"pointer",background:ia?"rgba(245,158,11,0.07)":"transparent",borderLeft:ia?"3px solid #F59E0B":"3px solid transparent",display:"flex",alignItems:"center",gap:12,transition:"background .1s",minHeight:60}}>
              <div style={{position:"relative"}}><Avatar name={m.full_name} size={40} color={m.color||null}/>{u>0&&<div style={{position:"absolute",top:-4,right:-4,background:"#EF4444",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid #161B22"}}>{u>9?"9+":u}</div>}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.full_name}</div>{m.username&&<div style={{fontSize:12,color:"#6E7681",fontFamily:"monospace"}}>@{m.username}</div>}{u>0&&<div style={{fontSize:11,color:"#EF4444",marginTop:1}}>{u} unread</div>}</div>
              <div style={{color:"#555d65",fontSize:18}}>›</div>
            </div>
          );})}
        </div>
      </div>
      <div style={{flex:1,display:mView==="sidebar"&&window.innerWidth<900?"none":"flex",flexDirection:"column",minWidth:0}}>
        {!sel?(<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#484f58"}}><svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#30363D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><div style={{fontSize:14}}>{isM?"Select a mechanic to message":"Select a conversation"}</div></div>):(
          <>
            <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setMView("sidebar")} style={{background:"none",border:"none",color:"#8B949E",fontSize:22,cursor:"pointer",padding:"0 4px"}}>‹</button>
              <Avatar name={sel.full_name} size={36}/>
              <div><div style={{fontSize:15,fontWeight:700}}>{sel.full_name}</div>{sel.username&&<div style={{fontSize:12,color:"#6E7681",fontFamily:"monospace"}}>@{sel.username}</div>}</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 14px 10px",display:"flex",flexDirection:"column",gap:10}}>
              {loading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,gap:10,color:"#8B949E"}}><Spinner/>Loading…</div>:msgs.length===0?<div style={{textAlign:"center",color:"#484f58",fontSize:13,marginTop:40}}>No messages yet. Say hello!</div>:msgs.map(m=>{const mine=m.sender_id===currentUser.id;return(
                <div key={m.id} className="pop-in" style={{display:"flex",flexDirection:"column",alignItems:mine?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",background:mine?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.06)",border:mine?"1px solid rgba(245,158,11,0.25)":"1px solid rgba(255,255,255,0.08)",fontSize:15,lineHeight:1.55,color:"#E6EDF3",wordBreak:"break-word",whiteSpace:"pre-wrap"}}>{m.body}</div>
                  <div style={{fontSize:11,color:"#555d65",marginTop:3,display:"flex",alignItems:"center",gap:5}}>{timeAgo(m.created_at)}{mine&&<span style={{color:m.is_read?"#10B981":"#555d65"}}>{m.is_read?"✓✓":"✓"}</span>}</div>
                </div>
              );})}
              <div ref={bot}/>
            </div>
            <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Type a message…" rows={2} style={{flex:1,fontSize:15,padding:"10px 12px",minHeight:50,maxHeight:100}}/>
              <button onClick={send} disabled={sending||!body.trim()} style={{width:48,height:50,borderRadius:10,background:"#F59E0B",border:"none",color:"#0D1117",fontSize:20,cursor:sending||!body.trim()?"not-allowed":"pointer",opacity:sending||!body.trim()?.5:1,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}}>{sending?<Spinner size={16}/>:"↑"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Order Modal ────────────────────────────────────────────────────────────────

const BLANK={customer:"",make:"Toyota",model:"",year:currentYear,vin:"",color:"",task:"",mechanic_id:"",status:"Pending",date_received:"",date_assigned:""};

function OrderModal({mode,order,mechanics,onSave,onClose,saving}){
  const[form,setForm]=useState(mode==="edit"?{...BLANK,...order,mechanic_id:order.mechanic_id??"",color:order.color??"",date_received:order.date_received??"",date_assigned:order.date_assigned??""}: {...BLANK});
  const[errs,setErrs]=useState({});
  const[decoding,setDecoding]=useState(false);
  const[decodeMsg,setDecodeMsg]=useState("");
  const[decodeMsgType,setDecodeMsgType]=useState("success"); // "success"|"error"
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const decodeVIN=async()=>{
    const vin=form.vin.trim().toUpperCase();
    if(vin.length!==17){setDecodeMsg("Enter all 17 VIN characters first.");setDecodeMsgType("error");return;}
    setDecoding(true);setDecodeMsg("");
    try{
      const res=await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
      const data=await res.json();
      const get=varName=>data.Results?.find(r=>r.Variable===varName)?.Value??"";
      const make=get("Make");
      const model=get("Model");
      const year=get("Model Year");
      const plant=get("Plant Country");
      if(!make||make==="0"||make==="null"){setDecodeMsg("VIN not recognised. Check the number and try again.");setDecodeMsgType("error");setDecoding(false);return;}
      // Match make to our list (case-insensitive)
      const matchedMake=MAKES.find(m=>m.toLowerCase()===make.toLowerCase())||make;
      setForm(f=>({
        ...f,
        make: MAKES.includes(matchedMake)?matchedMake:f.make,
        model: model&&model!=="0"&&model!=="null"?model:f.model,
        year: year&&year!=="0"&&year!=="null"?parseInt(year):f.year,
      }));
      const parts=[];
      if(year&&year!=="0"&&year!=="null")parts.push(year);
      if(make&&make!=="0"&&make!=="null")parts.push(make);
      if(model&&model!=="0"&&model!=="null")parts.push(model);
      if(plant&&plant!=="0"&&plant!=="null")parts.push("Built in "+plant);
      setDecodeMsg("✓ Decoded: "+parts.join(" · "));
      setDecodeMsgType("success");
    }catch{setDecodeMsg("Could not reach NHTSA. Check your internet connection.");setDecodeMsgType("error");}
    setDecoding(false);
  };


  const validate=()=>{const e={};if(!form.customer.trim())e.customer="Required";if(!form.model.trim())e.model="Required";if(!form.vin.trim())e.vin="Required";else if(form.vin.trim().length!==17)e.vin="Must be 17 characters";if(!form.task.trim())e.task="Required";return e;};
  const save=()=>{const e=validate();if(Object.keys(e).length){setErrs(e);return;}onSave({...form,vin:form.vin.toUpperCase().trim(),year:parseInt(form.year),mechanic_id:form.mechanic_id||null,color:form.color||null,date_received:form.date_received||null,date_assigned:form.date_assigned||null});};
  const days=daysOnLot(form.date_received);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div className="slide-up" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:660,maxHeight:"95vh",overflow:"auto",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"12px auto 0",flexShrink:0}}/>
        <div style={{padding:"12px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:16,fontWeight:700}}>{mode==="create"?"NEW WORK ORDER":`EDIT — ${order.order_number}`}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6E7681",fontSize:28,cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"16px 20px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:10,fontWeight:700,color:"#484f58",letterSpacing:"0.12em"}}>CUSTOMER</div>
            <div><FieldLabel required>Customer Name</FieldLabel><input value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="Full name"/><FieldErr msg={errs.customer}/></div>
            <div style={{fontSize:10,fontWeight:700,color:"#484f58",letterSpacing:"0.12em",marginTop:4}}>VEHICLE DETAILS</div>
            <div className="modal-grid" style={{display:"grid",gap:12}}>
              <div><FieldLabel required>Make</FieldLabel><select value={form.make} onChange={e=>set("make",e.target.value)}>{MAKES.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><FieldLabel required>Model</FieldLabel><input value={form.model} onChange={e=>set("model",e.target.value)} placeholder="e.g. Camry"/><FieldErr msg={errs.model}/></div>
              <div><FieldLabel>Year</FieldLabel><select value={form.year} onChange={e=>set("year",e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></div>
              <div><FieldLabel>Color</FieldLabel><div style={{display:"flex",alignItems:"center",gap:8}}><select value={form.color} onChange={e=>set("color",e.target.value)} style={{flex:1}}><option value="">— Select color —</option>{VEHICLE_COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select>{form.color&&<ColorDot color={form.color} size={22}/>}</div></div>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <FieldLabel required>VIN (17 characters)</FieldLabel>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <input
                    value={form.vin}
                    onChange={e=>{const v=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"");set("vin",v);setDecodeMsg("");}}
                    placeholder="1HGCM82633A123456"
                    maxLength={17}
                    style={{fontFamily:"monospace",fontSize:14,letterSpacing:"0.08em"}}
                  />
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>
                    <span style={{fontSize:11,color:form.vin.length===17?"#10B981":"#6E7681"}}>{form.vin.length}/17 chars</span>
                    {decodeMsg&&<span style={{fontSize:12,color:decodeMsgType==="success"?"#10B981":"#F87171",fontWeight:600}}>{decodeMsg}</span>}
                  </div>
                  <FieldErr msg={errs.vin}/>
                </div>
                <button
                  type="button"
                  onClick={decodeVIN}
                  disabled={decoding||form.vin.length!==17}
                  style={{flexShrink:0,background:form.vin.length===17?"rgba(59,130,246,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${form.vin.length===17?"rgba(59,130,246,0.4)":"rgba(255,255,255,0.08)"}`,color:form.vin.length===17?"#3B82F6":"#555d65",borderRadius:8,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:decoding||form.vin.length!==17?"not-allowed":"pointer",fontFamily:"'Rajdhani',sans-serif",minHeight:44,display:"flex",alignItems:"center",gap:6,transition:"all .15s",opacity:form.vin.length!==17?.4:1,touchAction:"manipulation",whiteSpace:"nowrap"}}
                >
                  {decoding
                    ? <><div style={{width:14,height:14,border:"2px solid rgba(59,130,246,0.3)",borderTop:"2px solid #3B82F6",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>DECODING…</>
                    : <>🔍 DECODE VIN</>}
                </button>
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:"#484f58",letterSpacing:"0.12em",marginTop:4}}>DATES</div>
            <div className="modal-grid" style={{display:"grid",gap:12}}>
              <div><FieldLabel>Date Received in Inventory</FieldLabel><input type="date" value={form.date_received} onChange={e=>set("date_received",e.target.value)}/></div>
              <div><FieldLabel>Date Assigned to Mechanic</FieldLabel><input type="date" value={form.date_assigned} onChange={e=>set("date_assigned",e.target.value)}/></div>
            </div>
            {form.date_received&&<div style={{background:days>=30?"rgba(239,68,68,0.07)":days>=14?"rgba(245,158,11,0.07)":"rgba(16,185,129,0.07)",border:`1px solid ${lotColor(days)}30`,borderRadius:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:36,fontWeight:700,color:lotColor(days),lineHeight:1,fontFamily:"monospace"}}>{days}</div><div><div style={{fontSize:14,fontWeight:600,color:lotColor(days)}}>days on lot {days>=30?"⚠":""}</div><div style={{fontSize:11,color:"#6E7681",marginTop:2}}>{lotLabel(days)} · Auto-calculated</div></div></div>}
            <div style={{fontSize:10,fontWeight:700,color:"#484f58",letterSpacing:"0.12em",marginTop:4}}>ASSIGNMENT</div>
            <div className="modal-grid" style={{display:"grid",gap:12}}>
              <div><FieldLabel>Assign Mechanic</FieldLabel><select value={form.mechanic_id} onChange={e=>set("mechanic_id",e.target.value)}><option value="">— Unassigned —</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name} (@{m.username??"—"})</option>)}</select></div>
              <div><FieldLabel>Status</FieldLabel><select value={form.status} onChange={e=>set("status",e.target.value)}>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:"#484f58",letterSpacing:"0.12em",marginTop:4}}>TASK</div>
            <div><FieldLabel required>Task Description</FieldLabel><textarea value={form.task} onChange={e=>set("task",e.target.value)} placeholder="Describe the work..." rows={4} style={{resize:"vertical",minHeight:90}}/><FieldErr msg={errs.task}/></div>
          </div>
        </div>
        <div style={{padding:"12px 20px 20px",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{flex:1}}>CANCEL</Btn>
          <Btn variant="primary" onClick={save} disabled={saving} style={{flex:2}}>{saving?<><Spinner size={14}/>SAVING…</>:mode==="create"?"CREATE ORDER":"SAVE CHANGES"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────

function ConfirmModal({title,body,confirmLabel,confirmVariant="danger",onConfirm,onClose,loading}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div className="slide-up" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,padding:"20px 20px 28px",paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{fontSize:18,fontWeight:700,marginBottom:10}}>{title}</div>
        <div style={{color:"#8B949E",fontSize:14,lineHeight:1.7,marginBottom:20}}>{body}</div>
        <div style={{display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={onClose} disabled={loading} style={{flex:1}}>CANCEL</Btn>
          <Btn variant={confirmVariant} onClick={onConfirm} disabled={loading} style={{flex:2}}>{loading?<><Spinner size={14}/>WORKING…</>:confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Add Mechanic Modal (username-based) ────────────────────────────────────────

function AddMechanicModal({onClose,onCreated}){
  const[form,setForm]=useState({name:"",username:"",password:"",confirm:"",color:MECHANIC_COLORS[0].value});const[errs,setErrs]=useState({});const[saving,setSaving]=useState(false);const[apiErr,setApiErr]=useState("");const[success,setSuccess]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const validate=()=>{const e={};if(!form.name.trim())e.name="Required";if(!form.username.trim())e.username="Required";else if(!isValidUsername(form.username))e.username="3–20 chars: letters, numbers, _ or -";if(!form.password)e.password="Required";else if(form.password.length<6)e.password="Min 6 characters";if(form.confirm!==form.password)e.confirm="Passwords do not match";return e;};
  const create=async()=>{
    const e=validate();if(Object.keys(e).length){setErrs(e);return;}
    setSaving(true);setApiErr("");setSuccess("");
    try{
      const uname=form.username.toLowerCase().trim();
      const authEmail=usernameToEmail(uname);

      // Check username not already taken
      const{data:ex}=await supabase.from("profiles").select("id").eq("username",uname);
      if(ex&&ex.length>0){setApiErr("That username is already taken.");setSaving(false);return;}

      // Use Supabase Admin API with service role key — no emails sent, no rate limits
      const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
      const serviceKey=import.meta.env.VITE_SUPABASE_SERVICE_KEY;
      if(!serviceKey){setApiErr("Service key not configured. Add VITE_SUPABASE_SERVICE_KEY to your .env file.");setSaving(false);return;}
      const signupRes=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":serviceKey,
          "Authorization":`Bearer ${serviceKey}`,
        },
        body:JSON.stringify({
          email:authEmail,
          password:form.password,
          email_confirm:true, // mark as confirmed — no email sent
        }),
      });
      const signupData=await signupRes.json();
      if(!signupRes.ok){setApiErr(signupData.msg||signupData.message||signupData.error_description||"Failed to create account.");setSaving(false);return;}
      const newId=signupData.id;
      if(!newId){setApiErr("Account created but ID not returned. Try again.");setSaving(false);return;}

      // Insert profile — manager session is still intact
      const{error:pe}=await supabase.from("profiles").insert({
        id:newId,full_name:form.name.trim(),initials:getInitials(form.name),
        role:"mechanic",username:uname,auth_email:authEmail,color:form.color||null
      });
      if(pe){setApiErr(pe.message);setSaving(false);return;}

      setSuccess(`Done! ${form.name} can log in with @${uname}.`);
      setSaving(false);onCreated();
      setTimeout(()=>{setSuccess("");onClose();},3000);
    }catch(err){setApiErr(err?.message??"Unexpected error. Please try again.");setSaving(false);}
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(3px)"}}>
      <div className="slide-up" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))"}}>
        <div style={{width:36,height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,margin:"12px auto 0"}}/>
        <div style={{padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:16,fontWeight:700}}>ADD MECHANIC</div><div style={{fontSize:12,color:"#8B949E",marginTop:2}}>They log in with a username — no email needed</div></div>
          <button onClick={onClose} disabled={saving} style={{background:"none",border:"none",color:"#6E7681",fontSize:28,cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div><FieldLabel required>Full Name</FieldLabel><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. James Carter"/><FieldErr msg={errs.name}/></div>
          <div>
            <FieldLabel required>Username</FieldLabel>
            <div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#555d65",fontSize:15,fontWeight:600,pointerEvents:"none"}}>@</span><input value={form.username} onChange={e=>set("username",e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,""))} placeholder="e.g. james_carter" autoCapitalize="none" autoCorrect="off" style={{paddingLeft:28}}/></div>
            <div style={{fontSize:11,color:"#555d65",marginTop:4}}>Letters, numbers, _ or - · 3–20 characters</div>
            <FieldErr msg={errs.username}/>
          </div>
          <div><FieldLabel required>Password</FieldLabel><input type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Minimum 6 characters"/><FieldErr msg={errs.password}/></div>
          <div><FieldLabel required>Confirm Password</FieldLabel><input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Re-enter password"/><FieldErr msg={errs.confirm}/></div>
          <div>
            <FieldLabel required>Mechanic Color</FieldLabel>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:2}}>
              {MECHANIC_COLORS.map(c=>(
                <button key={c.value} type="button" title={c.label} onClick={()=>set("color",c.value)}
                  style={{width:36,height:36,borderRadius:"50%",background:c.value,border:form.color===c.value?`3px solid #fff`:`2px solid ${c.value}55`,cursor:"pointer",flexShrink:0,transition:"transform .12s,border .12s",transform:form.color===c.value?"scale(1.2)":"scale(1)",boxShadow:form.color===c.value?`0 0 0 2px #0D1117, 0 0 0 4px ${c.value}`:"none"}}
                />
              ))}
            </div>
            <div style={{fontSize:11,color:"#6E7681",marginTop:6}}>
              Selected: <span style={{color:form.color,fontWeight:700}}>{MECHANIC_COLORS.find(c=>c.value===form.color)?.label||"—"}</span>
            </div>
          </div>
          <ErrBanner msg={apiErr}/><SuccessBanner msg={success}/>
          <div style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#8B949E",lineHeight:1.6}}>Login: <strong style={{color:"#F59E0B"}}>@{form.username||"username"}</strong> + password. No email required.</div>
        </div>
        <div style={{padding:"0 20px 20px",display:"flex",gap:10}}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{flex:1}}>CANCEL</Btn>
          <Btn variant="green" onClick={create} disabled={saving} style={{flex:2}}>{saving?<><Spinner size={14}/>CREATING…</>:"CREATE ACCOUNT"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Mechanics Panel ────────────────────────────────────────────────────────────

function MechanicsPanel({mechanics,orders,onAdd,onDelete,onColorChange,onResetPwd,loading}){
  const cnt=(id,s)=>orders.filter(o=>o.mechanic_id===id&&(!s||o.status===s)).length;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:14,color:"#8B949E"}}>{mechanics.length} mechanic{mechanics.length!==1?"s":""}</div><Btn variant="green" onClick={onAdd} style={{padding:"8px 16px"}}>+ ADD</Btn></div>
      {loading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48,gap:12,color:"#8B949E"}}><Spinner/>Loading…</div>:mechanics.length===0?<div style={{textAlign:"center",padding:"48px 20px",background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,color:"#6E7681"}}><div style={{fontSize:36,marginBottom:12}}>👷</div><div style={{fontSize:17,fontWeight:600,marginBottom:8}}>No Mechanics Yet</div><div style={{marginTop:16}}><Btn variant="green" onClick={onAdd}>+ ADD MECHANIC</Btn></div></div>:(
        <div className="mechanic-grid" style={{display:"grid",gap:12}}>
          {mechanics.map(m=>{const t=cnt(m.id),p=cnt(m.id,"Pending"),a=cnt(m.id,"In Progress"),d=cnt(m.id,"Completed");return(
            <div key={m.id} style={{background:"#1C2333",border:`1px solid ${m.color?(m.color+"33"):"rgba(255,255,255,0.06)"}`,borderTop:`3px solid ${m.color||"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"16px 16px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <Avatar name={m.full_name} size={42} color={m.color||null}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.full_name}</div>
                  <div style={{fontSize:13,color:m.color||"#F59E0B",fontFamily:"monospace",marginTop:1}}>@{m.username??"—"}</div>
                </div>
                <div style={{background:m.color?(m.color+"22"):"rgba(59,130,246,0.1)",color:m.color||"#3B82F6",border:`1px solid ${m.color?(m.color+"55"):"rgba(59,130,246,0.25)"}`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,flexShrink:0}}>MECH</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
                {[{l:"Total",v:t,c:"#E6EDF3"},{l:"Pend.",v:p,c:"#F59E0B"},{l:"Active",v:a,c:"#3B82F6"},{l:"Done",v:d,c:"#10B981"}].map(s=><div key={s.l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 4px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:9,color:"#555d65",marginTop:3}}>{s.l.toUpperCase()}</div></div>)}
              </div>
              {/* Color swatches */}
              <div style={{marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,color:"#555d65",letterSpacing:"0.1em",marginBottom:6}}>MECHANIC COLOR</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {MECHANIC_COLORS.map(c=>(
                    <button key={c.value} type="button" title={c.label}
                      onClick={async()=>{
                        await supabase.from("profiles").update({color:c.value}).eq("id",m.id);
                        onColorChange(m.id,c.value);
                      }}
                      style={{width:24,height:24,borderRadius:"50%",background:c.value,border:(m.color||getMechColor(m))===c.value?`2px solid #fff`:`1.5px solid ${c.value}55`,cursor:"pointer",flexShrink:0,transition:"transform .12s",transform:(m.color||getMechColor(m))===c.value?"scale(1.25)":"scale(1)",boxShadow:(m.color||getMechColor(m))===c.value?`0 0 0 2px #1C2333, 0 0 0 3px ${c.value}`:"none"}}
                    />
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="blue" onClick={()=>onResetPwd(m)} style={{flex:1,padding:"8px",fontSize:12}}>🔑 RESET PWD</Btn>
                <Btn variant="red" onClick={()=>onDelete(m)} style={{flex:1,padding:"8px",fontSize:12}}>REMOVE</Btn>
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}


// ── Reset Mechanic Password Modal (manager only) ───────────────────────────────

function ResetMechanicPasswordModal({ mechanic, onClose }) {
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [msgType, setMsgType] = useState("success");

  const reset = async () => {
    if (newPass.length < 6) { setMsg("Password must be at least 6 characters."); setMsgType("error"); return; }
    if (newPass !== confirm) { setMsg("Passwords do not match."); setMsgType("error"); return; }
    setSaving(true); setMsg("");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
      if (!serviceKey) { setMsg("Service key not configured."); setMsgType("error"); setSaving(false); return; }

      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${mechanic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ password: newPass }),
      });
      if (!res.ok) { const d = await res.json(); setMsg(d.message || "Failed to reset password."); setMsgType("error"); setSaving(false); return; }
      setMsg(`✓ Password reset for ${mechanic.full_name}!`); setMsgType("success");
      setNewPass(""); setConfirm("");
      setTimeout(() => onClose(), 2000);
    } catch(e) { setMsg(e?.message ?? "Unexpected error."); setMsgType("error"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div className="slide-up" style={{ background:"#1C2333", border:"1px solid rgba(59,130,246,0.2)", borderRadius:"16px 16px 0 0", width:"100%", maxWidth:480, paddingBottom:"calc(20px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ width:36, height:4, background:"rgba(255,255,255,0.15)", borderRadius:2, margin:"12px auto 0" }}/>
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>RESET PASSWORD</div>
            <div style={{ fontSize:12, color:"#8B949E", marginTop:2 }}>
              Setting new password for <strong style={{ color:"#3B82F6" }}>{mechanic.full_name}</strong> (@{mechanic.username})
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6E7681", fontSize:28, cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel required>New Password</FieldLabel>
            <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="At least 6 characters"/>
          </div>
          <div>
            <FieldLabel required>Confirm Password</FieldLabel>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&reset()} placeholder="Re-enter password"/>
          </div>
          {msg && (
            <div style={{ background:msgType==="success"?"rgba(16,185,129,0.09)":"rgba(239,68,68,0.09)", border:`1px solid ${msgType==="success"?"rgba(16,185,129,0.28)":"rgba(239,68,68,0.28)"}`, color:msgType==="success"?"#34D399":"#F87171", borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:600 }}>
              {msg}
            </div>
          )}
        </div>
        <div style={{ padding:"0 20px 20px", display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving} style={{ flex:1 }}>CANCEL</Btn>
          <Btn variant="blue" onClick={reset} disabled={saving||!newPass||!confirm} style={{ flex:2 }}>
            {saving ? <><Spinner size={14}/>RESETTING…</> : "RESET PASSWORD"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Work Order card (mobile) + table (desktop) ─────────────────────────────────

function OrderCard({o,mechName,onEdit,onDelete}){
  return(
    <div className="slide-in" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div><span style={{fontFamily:"monospace",fontSize:13,color:"#F59E0B",fontWeight:600}}>{o.order_number}</span><div style={{fontSize:16,fontWeight:700,marginTop:2}}>{o.customer}</div></div>
        <StatusBadge status={o.status}/>
      </div>
      <div style={{fontSize:13,color:"#8B949E",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
        {o.year} {o.make} {o.model}{o.color&&<><ColorDot color={o.color} size={10}/><span>{o.color}</span></>}
      </div>
      <div style={{fontFamily:"monospace",fontSize:11,color:"#555d65",marginBottom:8}}>{o.vin}</div>
      {(o.date_received||o.date_assigned)&&<div style={{display:"flex",gap:12,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        {o.date_received&&<span style={{fontSize:12,color:"#6E7681"}}>📥 {fmtDate(o.date_received)}</span>}
        {daysOnLot(o.date_received)!==null&&<span style={{fontSize:12,fontWeight:700,color:lotColor(daysOnLot(o.date_received))}}>{daysOnLot(o.date_received)}d on lot {daysOnLot(o.date_received)>=30?"⚠":""}</span>}
        {o.date_assigned&&<span style={{fontSize:12,color:"#6E7681"}}>🔧 {fmtDate(o.date_assigned)}</span>}
      </div>}
      <div style={{fontSize:13,color:"#C9D1D9",lineHeight:1.5,marginBottom:10,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{o.task}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#6E7681"}}>{mechName(o.mechanic_id)}</span>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="blue" onClick={()=>onEdit(o)} style={{padding:"6px 14px",fontSize:12}}>EDIT</Btn>
          <Btn variant="red"  onClick={()=>onDelete(o)} style={{padding:"6px 14px",fontSize:12}}>DEL</Btn>
        </div>
      </div>
    </div>
  );
}

function WorkOrderTable({orders,mechanics,onEdit,onDelete,onCreate,loading}){
  const[search,setSearch]=useState("");const[fs,setFs]=useState("All");const[sf,setSf]=useState("created_at");const[sd,setSd]=useState("desc");
  const ts=f=>{if(sf===f)setSd(d=>d==="asc"?"desc":"asc");else{setSf(f);setSd("asc");}};
  const mn=id=>mechanics.find(m=>m.id===id)?.full_name??"Unassigned";
  const fil=orders.filter(o=>{const q=search.toLowerCase();const mq=!q||[o.order_number,o.customer,o.make,o.model,o.vin,o.color].some(v=>(v??"").toLowerCase().includes(q));return mq&&(fs==="All"||o.status===fs);}).sort((a,b)=>{let va=a[sf]??"",vb=b[sf]??"";if(typeof va==="string")va=va.toLowerCase();if(typeof vb==="string")vb=vb.toLowerCase();return sd==="asc"?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);});
  const TH=({label,field})=><th onClick={field?()=>ts(field):undefined} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6E7681",letterSpacing:"0.1em",whiteSpace:"nowrap",cursor:field?"pointer":"default",userSelect:"none"}} onMouseEnter={e=>{if(field)e.currentTarget.style.color="#8B949E";}} onMouseLeave={e=>{if(field)e.currentTarget.style.color="#6E7681";}}>{label}{field&&<span style={{marginLeft:4,color:sf===field?"#F59E0B":"#404953"}}>{sf===field?(sd==="asc"?"↑":"↓"):"↕"}</span>}</th>;
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{flex:1,minWidth:140}}/>
        <select value={fs} onChange={e=>setFs(e.target.value)} style={{width:130}}><option>All</option>{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>
        <Btn variant="primary" onClick={onCreate} style={{padding:"10px 16px"}}>+ NEW</Btn>
      </div>
      {loading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48,gap:12,color:"#8B949E"}}><Spinner/>Loading…</div>:(
        <>
          <div className="card-list">{fil.length===0?<div style={{padding:"40px 0",textAlign:"center",color:"#6E7681"}}><div style={{fontSize:28,marginBottom:8}}>🔍</div>No orders match</div>:fil.map(o=><OrderCard key={o.id} o={o} mechName={mn} onEdit={onEdit} onDelete={onDelete}/>)}</div>
          <div className="table-wrap" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
                <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}><TH label="ORDER #" field="order_number"/><TH label="CUSTOMER" field="customer"/><TH label="VEHICLE"/><TH label="COLOR"/><TH label="RECEIVED" field="date_received"/><TH label="LOT DAYS"/><TH label="ASSIGNED" field="date_assigned"/><TH label="MECHANIC"/><TH label="STATUS" field="status"/><TH label="ACTIONS"/></tr></thead>
                <tbody>
                  {fil.length===0?<tr><td colSpan={10} style={{padding:"40px",textAlign:"center",color:"#6E7681"}}>No orders match</td></tr>:fil.map((o,i)=>(
                    <tr key={o.id} style={{borderBottom:i<fil.length-1?"1px solid rgba(255,255,255,0.04)":"none",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.018)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"12px 12px"}}><span style={{fontFamily:"monospace",fontSize:13,color:"#F59E0B",fontWeight:600}}>{o.order_number}</span></td>
                      <td style={{padding:"12px 12px"}}><div style={{fontWeight:600}}>{o.customer}</div></td>
                      <td style={{padding:"12px 12px"}}><div style={{fontSize:13,fontWeight:600}}>{o.year} {o.make} {o.model}</div><div style={{fontFamily:"monospace",fontSize:11,color:"#6E7681"}}>{o.vin}</div></td>
                      <td style={{padding:"12px 12px"}}>{o.color?<div style={{display:"flex",alignItems:"center",gap:6}}><ColorDot color={o.color} size={11}/><span style={{fontSize:13}}>{o.color}</span></div>:<span style={{color:"#484f58",fontSize:12}}>—</span>}</td>
                      <td style={{padding:"12px 12px"}}><span style={{fontFamily:"monospace",fontSize:12,color:"#8B949E"}}>{fmtDate(o.date_received)}</span></td>
                      <td style={{padding:"12px 12px"}}><LotBadge dateReceived={o.date_received}/></td>
                      <td style={{padding:"12px 12px"}}><span style={{fontFamily:"monospace",fontSize:12,color:"#8B949E"}}>{fmtDate(o.date_assigned)}</span></td>
                      <td style={{padding:"12px 12px"}}><span style={{fontSize:13,color:"#8B949E"}}>{mn(o.mechanic_id)}</span></td>
                      <td style={{padding:"12px 12px"}}><StatusBadge status={o.status}/></td>
                      <td style={{padding:"12px 12px"}}><div style={{display:"flex",gap:5}}><Btn variant="blue" onClick={()=>onEdit(o)} style={{padding:"4px 10px",fontSize:11}}>EDIT</Btn><Btn variant="red" onClick={()=>onDelete(o)} style={{padding:"4px 10px",fontSize:11}}>DEL</Btn></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <div style={{fontSize:12,color:"#555d65",marginTop:8}}>{fil.length} of {orders.length} orders</div>
    </div>
  );
}

// ── Manager Dashboard ──────────────────────────────────────────────────────────


// ── TV PIN Settings ────────────────────────────────────────────────────────────

function TVPinSettings({ userId }) {
  const [pin,    setPin]    = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm,setConfirm]= useState("");
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState("");
  const [msgType,setMsgType]= useState("success");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("tv_pin").eq("id", userId).single()
      .then(({ data, error }) => {
        if (!error && data?.tv_pin) setPin(data.tv_pin);
        setLoaded(true); // always show, even if column missing or query fails
      })
      .catch(() => setLoaded(true)); // still show on network error
  }, [userId]);

  const savePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setMsg("PIN must be exactly 4 digits."); setMsgType("error"); return; }
    if (newPin !== confirm) { setMsg("PINs do not match."); setMsgType("error"); return; }
    setSaving(true); setMsg("");
    const { error } = await supabase.from("profiles").update({ tv_pin: newPin }).eq("id", userId);
    if (error) { setMsg(error.message); setMsgType("error"); }
    else { setPin(newPin); setNewPin(""); setConfirm(""); setMsg("✓ TV PIN updated successfully."); setMsgType("success"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const clearPin = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ tv_pin: null }).eq("id", userId);
    setPin(""); setNewPin(""); setConfirm(""); setMsg("PIN removed — TV display is now unlocked."); setMsgType("success");
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div style={{ marginTop:28, background:"#1C2333", border:"1px solid rgba(139,92,246,0.2)", borderRadius:12, padding:"20px 20px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📺</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, letterSpacing:"0.04em" }}>TV DISPLAY PIN LOCK</div>
          <div style={{ fontSize:12, color:"#6E7681", marginTop:1 }}>{!loaded ? "Loading…" : pin ? "PIN is set — TV display is locked" : "No PIN set — anyone can navigate away from TV"}</div>
        </div>
        {pin && <div style={{ marginLeft:"auto", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#10B981" }}>🔒 ACTIVE</div>}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8B949E", letterSpacing:"0.09em", marginBottom:5 }}>NEW 4-DIGIT PIN</label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))}
              placeholder="• • • •"
              style={{ fontFamily:"monospace", letterSpacing:"0.3em", textAlign:"center", fontSize:18 }}
            />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8B949E", letterSpacing:"0.09em", marginBottom:5 }}>CONFIRM PIN</label>
            <input
              type="password" inputMode="numeric" maxLength={4}
              value={confirm}
              onChange={e => setConfirm(e.target.value.replace(/\D/g,"").slice(0,4))}
              placeholder="• • • •"
              style={{ fontFamily:"monospace", letterSpacing:"0.3em", textAlign:"center", fontSize:18 }}
            />
          </div>
        </div>

        {msg && <div style={{ fontSize:12, color:msgType==="success"?"#34D399":"#F87171", fontWeight:600 }}>{msg}</div>}

        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="purple" onClick={savePin} disabled={saving||newPin.length!==4||confirm.length!==4} style={{ flex:2, padding:"9px" }}>
            {saving ? <><Spinner size={13}/>SAVING…</> : pin ? "UPDATE PIN" : "SET PIN"}
          </Btn>
          {pin && <Btn variant="red" onClick={clearPin} disabled={saving} style={{ flex:1, padding:"9px" }}>REMOVE PIN</Btn>}
        </div>

        <div style={{ fontSize:11, color:"#484f58", lineHeight:1.6 }}>
          When set, anyone trying to navigate away from the TV display will see a PIN prompt. Only the manager knows the PIN.
        </div>
      </div>
    </div>
  );
}

function ManagerDashboard({user,onLogout}){
  const[orders,setOrders]=useState([]);const[mechanics,setMechanics]=useState([]);const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("orders");const[modal,setModal]=useState(null);const[sel,setSel]=useState(null);
  const[saving,setSaving]=useState(false);const[deleting,setDeleting]=useState(false);const[err,setErr]=useState("");
  const[showAdd,setShowAdd]=useState(false);const[selMech,setSelMech]=useState(null);const[delMech,setDelMech]=useState(false);const[unread,setUnread]=useState(0);const[showChangePwd,setShowChangePwd]=useState(false);const[selResetMech,setSelResetMech]=useState(null);

  const loadOrders   =async()=>{const{data,error}=await supabase.from("work_orders").select("*").order("created_at",{ascending:false});if(error)setErr(error.message);else setOrders(data??[]);};
  const loadMechanics=async()=>{const{data}=await supabase.from("profiles").select("*").eq("role","mechanic");setMechanics(data??[]);};
  const loadUnread   =async()=>{const{count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("receiver_id",user.id).eq("is_read",false);setUnread(count??0);};

  useEffect(()=>{setLoading(true);Promise.all([loadOrders(),loadMechanics(),loadUnread()]).finally(()=>setLoading(false));},[]);
  useEffect(()=>{const ch=supabase.channel("mgr-ur").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`receiver_id=eq.${user.id}`},()=>loadUnread()).subscribe();return()=>supabase.removeChannel(ch);},[]);

  const closeOrder=()=>{setModal(null);setSel(null);setSaving(false);setDeleting(false);setErr("");};

  const handleSave=async(form)=>{
    setSaving(true);setErr("");
    try{
      const pl={customer:form.customer,make:form.make,model:form.model,year:form.year,vin:form.vin,task:form.task,status:form.status,mechanic_id:form.mechanic_id||null,color:form.color||null,date_received:form.date_received||null,date_assigned:form.date_assigned||null};
      if(modal==="create"){
        const{error}=await supabase.from("work_orders").insert({...pl,created_by:user.id});
        if(error){setErr(error.message);setSaving(false);return;}
      }else{
        const{error}=await supabase.from("work_orders").update({...pl,updated_at:todayStr()}).eq("id",form.id);
        if(error){setErr(error.message);setSaving(false);return;}
      }
      await loadOrders();closeOrder();
    }catch(e){setErr(e?.message??"Unexpected error saving. Please try again.");setSaving(false);}
  };

  const handleDelOrder=async()=>{setDeleting(true);setErr("");const{error}=await supabase.from("work_orders").delete().eq("id",sel.id);if(error){setErr(error.message);setDeleting(false);return;}await loadOrders();closeOrder();};

  const handleDelMech=async()=>{
    setDelMech(true);setErr("");
    try{
      // 1. Unassign their work orders
      await supabase.from("work_orders").update({mechanic_id:null,updated_at:todayStr()}).eq("mechanic_id",selMech.id);

      // 2. Delete profile record
      const{error:pe}=await supabase.from("profiles").delete().eq("id",selMech.id);
      if(pe){setErr(pe.message);setDelMech(false);return;}

      // 3. Delete auth user via Admin API (requires service role key)
      const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
      const serviceKey=import.meta.env.VITE_SUPABASE_SERVICE_KEY;
      if(serviceKey){
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${selMech.id}`,{
          method:"DELETE",
          headers:{"apikey":serviceKey,"Authorization":`Bearer ${serviceKey}`},
        });
      }

      await Promise.all([loadOrders(),loadMechanics()]);
      setSelMech(null);setDelMech(false);
    }catch(e){setErr(e?.message??"Unexpected error removing mechanic.");setDelMech(false);}
  };

  const tabs=[{id:"orders",label:"Orders",icon:"📋",count:orders.length},{id:"team",label:"Team",icon:"👷",count:mechanics.length},{id:"messages",label:"Messages",icon:"💬",badge:unread}];

  return(
    <div style={{background:"#0D1117",minHeight:"100vh",paddingBottom:64}}>
      {showChangePwd&&<ChangePasswordModal onClose={()=>setShowChangePwd(false)}/>}
      <TopNav user={user} onLogout={onLogout} unreadCount={unread} onTVOpen={()=>window.open(window.location.origin+"?tv=1","_blank")} onChangePassword={()=>setShowChangePwd(true)}/>
      <div className="page-pad" style={{maxWidth:1600,margin:"0 auto"}}>
        <ErrBanner msg={err}/>
        {tab==="orders"&&<><StatsCards orders={orders}/><WorkOrderTable orders={orders} mechanics={mechanics} loading={loading} onCreate={()=>{setSaving(false);setErr("");setModal("create");}} onEdit={o=>{setSaving(false);setErr("");setSel(o);setModal("edit");}} onDelete={o=>{setSel(o);setModal("delete");}}/></>}
        {tab==="team"&&<><MechanicsPanel mechanics={mechanics} orders={orders} loading={loading} onAdd={()=>setShowAdd(true)} onDelete={m=>setSelMech(m)} onColorChange={(id,color)=>setMechanics(prev=>prev.map(m=>m.id===id?{...m,color}:m))} onResetPwd={m=>setSelResetMech(m)}/><TVPinSettings userId={user.id}/></>}
        {tab==="messages"&&<MessagingPanel currentUser={user} mechanics={mechanics}/>}
      </div>
      {/* Bottom tab bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:40,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==="messages")loadUnread();}} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",touchAction:"manipulation"}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",color:tab===t.id?"#F59E0B":"#6E7681"}}>{t.label.toUpperCase()}</span>
            {t.count>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 16px)",background:"rgba(255,255,255,0.1)",color:"#8B949E",borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:700,minWidth:16,textAlign:"center"}}>{t.count}</span>}
            {t.badge>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 16px)",background:"#EF4444",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:700,minWidth:16,textAlign:"center"}}>{t.badge}</span>}
            {tab===t.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,background:"#F59E0B",borderRadius:1}}/>}
          </button>
        ))}
      </div>
      {(modal==="create"||modal==="edit")&&<OrderModal mode={modal} order={sel} mechanics={mechanics} onSave={handleSave} onClose={closeOrder} saving={saving}/>}
      {modal==="delete"&&<ConfirmModal title="Delete Work Order" body={<>Delete <strong style={{color:"#F59E0B"}}>{sel?.order_number}</strong> for <strong style={{color:"#E6EDF3"}}>{sel?.customer}</strong>? This cannot be undone.</>} confirmLabel="DELETE ORDER" onConfirm={handleDelOrder} onClose={closeOrder} loading={deleting}/>}
      {showAdd&&<AddMechanicModal onClose={()=>setShowAdd(false)} onCreated={()=>loadMechanics()}/>}
      {selResetMech&&<ResetMechanicPasswordModal mechanic={selResetMech} onClose={()=>setSelResetMech(null)}/>}
      {selMech&&<ConfirmModal title="Remove Mechanic" body={<>Remove <strong style={{color:"#E6EDF3"}}>{selMech.full_name}</strong> (@{selMech.username})? {orders.filter(o=>o.mechanic_id===selMech.id).length>0&&<span style={{color:"#D97706"}}>⚠ Their orders will be unassigned. </span>}Cannot be undone.</>} confirmLabel="REMOVE MECHANIC" onConfirm={handleDelMech} onClose={()=>setSelMech(null)} loading={delMech}/>}
    </div>
  );
}

// ── Mechanic Dashboard ─────────────────────────────────────────────────────────

function MechanicDashboard({user,onLogout}){
  const[orders,setOrders]=useState([]);const[loading,setLoading]=useState(true);const[dbErr,setDbErr]=useState("");const[tab,setTab]=useState("orders");const[unread,setUnread]=useState(0);const[mgr,setMgr]=useState(null);const[filterSt,setFilterSt]=useState("All");const[showChangePwd,setShowChangePwd]=useState(false);

  const loadOrders=async()=>{setLoading(true);const{data,error}=await supabase.from("work_orders").select("*").eq("mechanic_id",user.id).order("created_at",{ascending:false});if(error)setDbErr(error.message);else setOrders(data??[]);setLoading(false);};
  const loadUnread=async()=>{const{count}=await supabase.from("messages").select("*",{count:"exact",head:true}).eq("receiver_id",user.id).eq("is_read",false);setUnread(count??0);};

  useEffect(()=>{loadOrders();loadUnread();supabase.from("profiles").select("*").eq("role","manager").single().then(({data})=>setMgr(data));},[]);
  useEffect(()=>{const ch=supabase.channel("mech-ur").on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`receiver_id=eq.${user.id}`},()=>loadUnread()).subscribe();return()=>supabase.removeChannel(ch);},[]);

  const handleStatus=async(id,status)=>{
    const{error}=await supabase.from("work_orders").update({status,updated_at:todayStr()}).eq("id",id);
    if(error){setDbErr(error.message);return;}
    setOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));
    if(status==="Completed"){
      const order=orders.find(o=>o.id===id);if(!order)return;
      const{data:manager}=await supabase.from("profiles").select("id").eq("role","manager").single();if(!manager)return;
      const cs=order.color?` ${order.color}`:"",days=daysOnLot(order.date_received),dt=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      const body=`✅ Work order ${order.order_number} has been completed.\n\nCustomer: ${order.customer}\nVehicle: ${order.year}${cs} ${order.make} ${order.model}\nVIN: ${order.vin}\n${days!==null?`Days on lot: ${days}\n`:""}Completed by: ${user.full_name} (@${user.username??"—"})\nDate: ${dt}`;
      await supabase.from("messages").insert({sender_id:user.id,receiver_id:manager.id,body});
    }
  };

  const filtered=filterSt==="All"?orders:orders.filter(o=>o.status===filterSt);
  const sc={All:orders.length,Pending:orders.filter(o=>o.status==="Pending").length,"In Progress":orders.filter(o=>o.status==="In Progress").length,Completed:orders.filter(o=>o.status==="Completed").length};
  const tabs=[{id:"orders",label:"My Orders",icon:"🔧"},{id:"messages",label:"Messages",icon:"💬",badge:unread}];

  return(
    <div style={{background:"#0D1117",minHeight:"100vh",paddingBottom:64}}>
      {showChangePwd&&<ChangePasswordModal onClose={()=>setShowChangePwd(false)}/>}
      <TopNav user={user} onLogout={onLogout} unreadCount={unread} onChangePassword={()=>setShowChangePwd(true)}/>
      <div className="page-pad" style={{maxWidth:900,margin:"0 auto"}}>
        <ErrBanner msg={dbErr}/>
        {tab==="orders"&&(
          <>
            {/* Status filter pills */}
            <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
              {["All","Pending","In Progress","Completed"].map(s=>{const active=filterSt===s;const c=s==="All"?"rgba(255,255,255,0.12)":s==="Pending"?"rgba(245,158,11,0.2)":s==="In Progress"?"rgba(59,130,246,0.2)":"rgba(16,185,129,0.2)";const tc=s==="All"?"#E6EDF3":s==="Pending"?"#F59E0B":s==="In Progress"?"#3B82F6":"#10B981";const bc=s==="All"?"rgba(255,255,255,0.2)":s==="Pending"?"rgba(245,158,11,0.4)":s==="In Progress"?"rgba(59,130,246,0.4)":"rgba(16,185,129,0.4)";return(
                <button key={s} onClick={()=>setFilterSt(s)} style={{flexShrink:0,background:active?c:"rgba(255,255,255,0.05)",color:active?tc:"#6E7681",border:`1px solid ${active?bc:"rgba(255,255,255,0.08)"}`,borderRadius:20,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",minHeight:38,touchAction:"manipulation"}}>
                  {s} {sc[s]>0&&<span style={{marginLeft:5,background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"0 6px",fontSize:11}}>{sc[s]}</span>}
                </button>
              );})}
            </div>
            {loading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:64,gap:12,color:"#8B949E"}}><Spinner/>Loading…</div>:filtered.length===0?<div style={{textAlign:"center",padding:"60px 20px",background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,color:"#6E7681"}}><div style={{fontSize:44,marginBottom:12}}>🔧</div><div style={{fontSize:17,fontWeight:600,marginBottom:6}}>{orders.length===0?"No Orders Assigned":"No Orders Here"}</div><div style={{fontSize:13}}>{orders.length===0?"Your manager hasn't assigned any orders yet.":"Try a different filter."}</div></div>:
              filtered.map(o=>{const m=STATUS_META[o.status]??STATUS_META["Pending"],days=daysOnLot(o.date_received);return(
                <div key={o.id} className="slide-in" style={{background:"#1C2333",border:"1px solid rgba(255,255,255,0.06)",borderLeft:`4px solid ${m.color}`,borderRadius:12,padding:16,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div><span style={{fontFamily:"monospace",fontSize:13,color:"#F59E0B",fontWeight:600}}>{o.order_number}</span><div style={{fontSize:17,fontWeight:700,marginTop:2}}>{o.customer}</div></div>
                    <StatusBadge status={o.status} large/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:"#8B949E",marginBottom:6}}>
                    <span>{o.year} {o.make} {o.model}</span>
                    {o.color&&<><ColorDot color={o.color} size={12}/><span>{o.color}</span></>}
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:11,color:"#555d65",marginBottom:8}}>{o.vin}</div>
                  {(o.date_received||o.date_assigned)&&<div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                    {o.date_received&&<span style={{fontSize:12,color:"#6E7681"}}>📥 {fmtDate(o.date_received)}</span>}
                    {days!==null&&<span style={{fontSize:12,fontWeight:700,color:lotColor(days)}}>· {days}d on lot {days>=30?"⚠":""}</span>}
                    {o.date_assigned&&<span style={{fontSize:12,color:"#6E7681"}}>🔧 {fmtDate(o.date_assigned)}</span>}
                  </div>}
                  <div style={{fontSize:14,color:"#C9D1D9",lineHeight:1.55,borderLeft:"2px solid rgba(245,158,11,0.25)",padding:"10px 12px",marginBottom:14,background:"rgba(255,255,255,0.02)",borderRadius:"0 8px 8px 0"}}>{o.task}</div>
                  {/* Touch-friendly status buttons */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#6E7681",letterSpacing:"0.1em",marginBottom:8}}>UPDATE STATUS {o.status!=="Completed"&&<span style={{color:"#484f58",fontWeight:400}}>· manager notified on completion</span>}</div>
                    <div style={{display:"flex",gap:8}}>
                      {STATUS_OPTIONS.map(s=>{const act=o.status===s;const bc=s==="Pending"?"#F59E0B":s==="In Progress"?"#3B82F6":"#10B981";return(
                        <button key={s} onClick={()=>handleStatus(o.id,s)} style={{flex:1,padding:"11px 6px",borderRadius:10,border:`2px solid ${act?bc:"rgba(255,255,255,0.08)"}`,background:act?bc+"25":"rgba(255,255,255,0.03)",color:act?bc:"#6E7681",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",touchAction:"manipulation",transition:"all .15s"}}>
                          {s==="Pending"?"Pending":s==="In Progress"?"Active":"Done"}
                        </button>
                      );})}
                    </div>
                  </div>
                </div>
              );})}
          </>
        )}
        {tab==="messages"&&<MessagingPanel currentUser={user} mechanics={mgr?[mgr]:[]}/>}
      </div>
      {/* Bottom tab bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#161B22",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:40,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==="messages")loadUnread();}} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",touchAction:"manipulation"}}>
            <span style={{fontSize:22}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?"#3B82F6":"#6E7681"}}>{t.label.toUpperCase()}</span>
            {t.badge>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 16px)",background:"#EF4444",color:"#fff",borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:700,minWidth:16,textAlign:"center"}}>{t.badge}</span>}
            {tab===t.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,background:"#3B82F6",borderRadius:1}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App(){
  const[user,setUser]=useState(null);const[checking,setChecking]=useState(true);
  useEffect(()=>{const el=document.createElement("style");el.textContent=GLOBAL_CSS;document.head.appendChild(el);return()=>document.head.removeChild(el);},[]);
  const isTV=new URLSearchParams(window.location.search).get("tv")==="1";
  if(isTV)return<TVDisplay/>;
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){const{data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();if(p)setUser({...session.user,...p});}
      setChecking(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_OUT"){setUser(null);return;}
      if(session?.user){const{data:p}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();if(p)setUser({...session.user,...p});}
    });
    return()=>subscription.unsubscribe();
  },[]);
  const logout=async()=>{await supabase.auth.signOut();setUser(null);window.location.href=window.location.origin;};
  if(checking)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0D1117"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}><div style={{width:36,height:36,border:"3px solid rgba(245,158,11,0.2)",borderTop:"3px solid #F59E0B",borderRadius:"50%",animation:"spin .7s linear infinite"}}/><div style={{color:"#6E7681",fontSize:14}}>LOADING…</div></div></div>;
  if(!user)return<LoginScreen onLogin={setUser}/>;
  if(user.role==="manager")return<ManagerDashboard user={user} onLogout={logout}/>;
  return<MechanicDashboard user={user} onLogout={logout}/>;
}
