/**
 * ChatPanel — conversations list + message thread, on top of message.service.
 *
 * Conversations and messages are RLS-scoped to the participants. Profile RLS
 * hides other users' names, so a conversation is labelled generically (date +
 * job context) rather than by the other party's name — enough to hold a
 * threaded conversation, which is the point.
 */
import React, { useEffect, useRef, useState } from "react";
import { listMyConversations, listMessages, sendMessage } from "../../services/message.service.js";

export default function ChatPanel({ lang = "mn", myId, onClose }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // conversation id
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    listMyConversations().then(setConvos).catch((e) => setError(e?.message || String(e)));
  }, []);

  // Load + light polling of the open thread.
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const load = () => listMessages(active).then((m) => { if (!stop) setMessages(m); }).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { stop = true; clearInterval(id); };
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = input.trim();
    if (!body || !active || busy) return;
    setBusy(true); setError(null);
    setInput("");
    try {
      const msg = await sendMessage({ conversationId: active, body });
      setMessages((m) => [...m, msg]);
    } catch (e) {
      setError(e?.userMessage?.[lang] || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (ts) => (ts ? new Date(ts).toLocaleDateString() : "");

  const S = {
    overlay: { position: "fixed", inset: 0, zIndex: 255, background: "var(--bg)", display: "flex", flexDirection: "column" },
    head: { display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    back: { background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, color: "#9a968d", cursor: "pointer", fontSize: 18 },
  };

  // ── Thread view ──
  if (active) {
    return (
      <div style={S.overlay}>
        <div style={S.head}>
          <button style={S.back} onClick={() => setActive(null)} aria-label="Back">←</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink,#f6f4ef)" }}>{L("Чат", "Chat")}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && <div style={{ color: "#9a968d", fontSize: 13, textAlign: "center", marginTop: 20 }}>{L("Мессеж алга. Эхний мессежээ бичээрэй.", "No messages yet. Say hello.")}</div>}
          {messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%", background: mine ? "linear-gradient(135deg,#FF6B35,#E85400)" : "rgba(255,255,255,0.06)", color: mine ? "#fff" : "var(--ink,#f6f4ef)", padding: "9px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.4 }}>
                {m.body}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {error && <div style={{ color: "#ff8a8a", fontSize: 12, padding: "0 18px 6px" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={L("Мессеж бичих…", "Type a message…")}
            style={{ flex: 1, padding: "12px 14px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--ink,#f6f4ef)", fontSize: 15 }} />
          <button onClick={send} disabled={busy || !input.trim()} style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontSize: 18, cursor: "pointer", opacity: busy || !input.trim() ? 0.5 : 1 }}>➤</button>
        </div>
      </div>
    );
  }

  // ── Conversations list ──
  return (
    <div style={S.overlay}>
      <div style={S.head}>
        <button style={S.back} onClick={onClose} aria-label="Close">✕</button>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>{L("Мессежүүд", "Messages")}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {convos.length === 0 && <div style={{ color: "#9a968d", fontSize: 14, textAlign: "center", marginTop: 30 }}>{L("Яриа алга. Нэр дэвшигчтэй холбогдоход эсвэл ажилд өргөдөл гаргахад эндээс харагдана.", "No conversations yet. They appear here after you contact a candidate or apply to a job.")}</div>}
        {convos.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "var(--ink,#f6f4ef)", cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,107,53,0.15)", display: "grid", placeItems: "center", fontSize: 18 }}>💬</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{L("Яриа", "Conversation")}</div>
              <div style={{ fontSize: 12, color: "#9a968d" }}>{fmtDate(c.created_at)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
