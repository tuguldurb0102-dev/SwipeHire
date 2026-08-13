/**
 * NotificationBell — 🔔 with an unread badge and a dropdown list.
 *
 * Reads via notification.service (RLS-scoped to the caller). Polls the unread
 * count while mounted. Opening the panel loads the list; tapping a notification
 * marks it read. Rows are created server-side by triggers (new application / new
 * message), so this works with no extra wiring once migration 009 is applied.
 */
import React, { useEffect, useState, useCallback } from "react";
import { listMyNotifications, unreadCount, markRead, markAllRead } from "../../services/notification.service.js";

export default function NotificationBell({ lang = "mn" }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(() => { unreadCount().then(setCount).catch(() => {}); }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 20000);
    return () => clearInterval(id);
  }, [refreshCount]);

  const openPanel = () => {
    setOpen(true); setLoading(true);
    listMyNotifications().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };

  const tap = async (n) => {
    if (!n.read_at) {
      try { await markRead(n.id); setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)); setCount((c) => Math.max(0, c - 1)); } catch { /* ignore */ }
    }
  };

  const allRead = async () => {
    try { await markAllRead(); setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() }))); setCount(0); } catch { /* ignore */ }
  };

  const when = (ts) => { const d = new Date(ts); const s = (Date.now() - d) / 1000; if (s < 60) return L("саяхан", "now"); if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return d.toLocaleDateString(); };

  return (
    <>
      <button onClick={openPanel} aria-label="Notifications" style={{
        position: "relative", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--hair-2)",
        background: "var(--surface)", cursor: "pointer", fontSize: 15,
      }}>
        🔔
        {count > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 999, background: "#FF6B35", color: "#fff", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid var(--bg)" }}>{count > 9 ? "9+" : count}</span>
        )}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 255, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "auto", background: "var(--bg-2)", borderRadius: "18px 18px 0 0", maxHeight: "72vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--hair)" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif" }}>{L("Мэдэгдэл", "Notifications")}</div>
              <button onClick={allRead} style={{ background: "none", border: "none", color: "#FF8A3D", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{L("Бүгдийг уншсан", "Mark all read")}</button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 12px 24px" }}>
              {loading && <div style={{ color: "var(--dim)", fontSize: 13, textAlign: "center", padding: 20 }}>…</div>}
              {!loading && items.length === 0 && <div style={{ color: "var(--dim)", fontSize: 14, textAlign: "center", padding: 30 }}>{L("Мэдэгдэл алга.", "No notifications yet.")}</div>}
              {items.map((n) => (
                <button key={n.id} onClick={() => tap(n)} style={{ width: "100%", display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 12px", borderRadius: 12, border: "1px solid var(--hair)", background: n.read_at ? "transparent" : "var(--surface)", color: "var(--ink)", cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,107,53,0.15)", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>{n.type === "new_message" ? "💬" : n.type === "new_application" ? "📋" : "🔔"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}{!n.read_at && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#FF6B35", marginLeft: 6 }} />}</div>
                    {n.body && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.body}</div>}
                    <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{when(n.created_at)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
