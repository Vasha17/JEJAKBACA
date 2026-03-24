import { useEffect, useRef, useMemo } from "react";
import { BookOpen } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import QRCode from "qrcode";

function QRCanvas({ value, size = 54 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

   useEffect(() => {
    if (!canvasRef.current) return;
    
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 0, 
      color: { dark: "#0d0d18", light: "#ffffff" },
    });
  }, [value, size]);  

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block", borderRadius: 4 }}
    />
  );
}

// ── Types ───────────────────────────────────────────────────────────────────
interface MemberCardProps {
  username: string;
  avatarUrl?: string;
  memberSince?: string;
  storiesCount: number;
  totalChapters: number;
  completedCount: number;
  avgRating: number;
  memberId?: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export function MemberCard({
  username,
  avatarUrl,
  memberSince = "2024",
  storiesCount,
  totalChapters,
  completedCount,
  avgRating,
  memberId,
}: MemberCardProps) {
  const { currentTheme, mode } = useTheme();

  // pull primary color from current theme, fallback to amber
  const primary = currentTheme?.[mode]?.primary ?? "#f59e0b";
  const bg      = currentTheme?.[mode]?.background ?? "#0d0d18";
  const card    = currentTheme?.[mode]?.card ?? "#16213e";

  const cardId = useMemo(() => {
    if (memberId) return memberId;
    // generate stable ID from username
    let h = 0;
    for (let i = 0; i < username.length; i++) h = Math.imul(31, h) + username.charCodeAt(i) | 0;
    return `JB-2024-${String(Math.abs(h) % 90000 + 10000)}`;
  }, [username, memberId]);

  const issueDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, ". ");

  return (        
      <div
        style={{                    
           maxWidth: "400px",  
          width: "100%",      
          margin: "0 auto",   
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
          background: bg,
        }}
      >
        {/* gradient overlay using theme primary */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(135deg, ${primary}cc 0%, ${primary}88 35%, ${card}dd 100%)`,
          pointerEvents: "none",
        }}/>

        {/* noise texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.055, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}/>

        {/* glossy sheen */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 40%, transparent 65%)",
        }}/>

        {/* decorative circles */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 320 180" fill="none" preserveAspectRatio="none">
          <circle cx="290" cy="15" r="70" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
          <circle cx="290" cy="15" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          <circle cx="-10" cy="170" r="65" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          <circle cx="175" cy="25" r="1.5" fill="rgba(255,255,255,0.5)"/>
          <circle cx="275" cy="70" r="1" fill="rgba(255,255,255,0.4)"/>
          <line x1="190" y1="48" x2="190" y2="54" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <line x1="187" y1="51" x2="193" y2="51" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <line x1="270" y1="110" x2="270" y2="116" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
          <line x1="267" y1="113" x2="273" y2="113" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        </svg>

        {/* ── CARD CONTENT ── */}
        <div style={{ position: "relative", display: "flex" }}>

          {/* LEFT STRIP */}
          <div style={{
            width: 100,
            flexShrink: 0,
            padding: "12px 10px 10px 12px",
            borderRight: "0.5px solid rgba(255,255,255,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            {/* avatar frame */}
            <div style={{
              width: "100%",
              aspectRatio: "3/4",
              borderRadius: 8,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
              }
            </div>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase" }}>Photo</span>

            {/* mini stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
              {[
                { label: "Stories",  val: storiesCount },
                { label: "Chapters", val: totalChapters },
                { label: "Done",     val: completedCount },
                { label: "Avg ★",    val: avgRating > 0 ? avgRating.toFixed(1) : "—" },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>{label}</span>
                  <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT MAIN */}
          <div style={{ flex: 1, padding: "12px 12px 10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>

            {/* top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <BookOpen size={11} color="rgba(255,255,255,0.9)"/>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.95)", textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                    JEJAKBACA
                  </span>
                </div>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", letterSpacing: "0.14em", textTransform: "uppercase", display: "block", marginTop: 1 }}>
                  Reader Card
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", display: "block" }}>Date of issue</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>{issueDate}</span>
              </div>
            </div>

            {/* divider */}
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.18)", marginBottom: 6 }}/>

            {/* fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 8px", flex: 1 }}>
              {[
                { label: "Name",   val: `@${username}`,  big: true },
                { label: "Since",  val: memberSince },
                { label: "Status", val: "Active" },
                { label: "Tier",   val: "★ Reader", gold: true },
              ].map(({ label, val, big, gold }) => (
                <div key={label}>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 1 }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: big ? 15 : 12,
                    fontWeight: 500,
                    color: gold ? "rgba(255,230,100,0.95)" : "#fff",
                    textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    lineHeight: 1.1,
                    display: "block",
                  }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* divider */}
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.18)", margin: "6px 0" }}/>

            {/* bottom: member ID + QR */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
              <div>
                <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 1 }}>
                  Member ID
                </span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontFamily: "monospace", letterSpacing: "0.07em" }}>
                  {cardId}
                </span>
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 6, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 1 }}>
                    Valid Thru
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                    12/27
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <div style={{
                  background: "rgba(255,255,255,0.93)",
                  borderRadius: 6,
                  padding: 3,
                  border: "0.5px solid rgba(255,255,255,0.4)",
                }}>
                  <QRCanvas value={cardId} size={44}/>
                </div>
                <span style={{ fontSize: 6, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Scan ID
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          position: "relative",
          background: "rgba(0,0,0,0.15)",
          borderTop: "0.5px solid rgba(255,255,255,0.1)",
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          {["Your reading journey, tracked", "JejakBaca © 2026"].map((t, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {i > 0 && <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "inline-block" }}/>}
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t}</span>
            </span>
          ))}
        </div>
      </div>    
  );
}