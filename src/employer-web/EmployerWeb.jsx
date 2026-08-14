/**
 * EmployerWeb — the desktop-first employer website for SwipeHire.
 *
 * A separate Vite entry (employer.html) that REUSES the same framework-agnostic
 * service layer and the same Supabase project as the mobile app. An employer who
 * registered on the app signs in here with the same email + password — one
 * backend, one account. Everything is RLS-scoped server-side.
 */
import React, { useEffect, useState, useCallback } from "react";
import { isConfigured } from "../services/supabase/client.js";
import { signIn, signUp, signOut, getSession, onAuthStateChange } from "../services/auth.service.js";
import { getCurrentProfile, updateEmployerProfile, listPublishedCandidates } from "../services/profile.service.js";
import { getOrCreateCompany } from "../services/company.service.js";
import { listMyJobs, createJob, updateJob } from "../services/job.service.js";
import { listCompanyApplications, setApplicationStatus } from "../services/application.service.js";
import { getCandidateDocumentUrl } from "../services/storage.service.js";
import { Styles } from "./styles.jsx";

const money = (n) => (n == null ? "—" : `₮${Number(n).toLocaleString()}`);

export default function EmployerWeb() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    let unsub = () => {};
    getSession().then(setSession).catch(() => {}).finally(() => setReady(true));
    unsub = onAuthStateChange((s) => setSession(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setCompany(null); return; }
    getCurrentProfile().then(setProfile).catch(() => {});
    getOrCreateCompany({}).then(setCompany).catch(() => {});
  }, [session]);

  if (!isConfigured) return <Configerror />;
  if (!ready) return <div style={{ color: "#9a968d", display: "grid", placeItems: "center", minHeight: "100vh" }}>…</div>;
  if (!session) return <><Styles /><Login /></>;
  return <><Styles /><Dashboard profile={profile} company={company} onCompany={setCompany} /></>;
}

function Configerror() {
  return (
    <div style={{ color: "#f6f4ef", minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 40, fontFamily: "inherit" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Тохиргоо дутуу</div>
        <div style={{ color: "#9a968d", marginTop: 8, maxWidth: 420 }}>
          Supabase орчны хувьсагч (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) тохируулаагүй тул нэвтрэлт ажиллахгүй.
          Netlify дээр эдгээрийг нэмнэ үү.
        </div>
      </div>
    </div>
  );
}

/* ── Login ──────────────────────────────────────────────────────────────── */
function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age18, setAge18] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async () => {
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === "signup") {
        const res = await signUp({ email, password, role: "employer", is18Plus: age18, redirectTo: window.location.origin });
        if (res.needsEmailConfirm) setInfo("Имэйлээ шалгаж баталгаажуулна уу.");
      } else {
        await signIn({ email, password });
      }
    } catch (e) {
      setError(e?.userMessage?.mn || e?.message || String(e));
    } finally { setBusy(false); }
  };

  const canSubmit = email.includes("@") && password.length >= 8 && (mode !== "signup" || age18);

  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="brand">
          <img src="/logo.png" alt="SwipeHire" className="brand__logo" />
          <div>
            <div className="brand__name">SwipeHire</div>
            <div className="brand__sub">Ажил олгогчийн платформ</div>
          </div>
        </div>
        <h1 className="auth__title">{mode === "signup" ? "Компанийн бүртгэл үүсгэх" : "Тавтай морил"}</h1>
        <p className="auth__lead">Ажлын зар нийтэлж, нэр дэвшигчдийг олж, ажилд аваарай.</p>

        <div className="tabs">
          <button className={mode === "signin" ? "tabs__b is-on" : "tabs__b"} onClick={() => { setMode("signin"); setError(null); }}>Нэвтрэх</button>
          <button className={mode === "signup" ? "tabs__b is-on" : "tabs__b"} onClick={() => { setMode("signup"); setError(null); }}>Бүртгүүлэх</button>
        </div>

        <label className="lbl">Имэйл</label>
        <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="company@example.com" />
        <label className="lbl">Нууц үг</label>
        <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ тэмдэгт" />

        {mode === "signup" && (
          <label className="chk">
            <input type="checkbox" checked={age18} onChange={(e) => setAge18(e.target.checked)} />
            <span>Би 18 нас хүрсэн бөгөөд Үйлчилгээний нөхцөл, Нууцлалын бодлогыг зөвшөөрч байна.</span>
          </label>
        )}

        {error && <div className="msg err">{error}</div>}
        {info && <div className="msg ok">{info}</div>}

        <button className="btn" disabled={!canSubmit || busy} onClick={submit}>
          {busy ? "Түр хүлээнэ үү…" : mode === "signup" ? "Бүртгэл үүсгэх" : "Нэвтрэх"}
        </button>
        <div className="auth__foot">Апп дээр бүртгүүлсэн бол мөн энэ мэдээллээрээ нэвтэрнэ.</div>
      </div>
      <div className="auth__side">
        <div className="auth__sideinner">
          <div className="kpi"><b>Видео CV</b><span>30 секундэд нэр дэвшигчийг таньж мэдээрэй</span></div>
          <div className="kpi"><b>AI тохироо</b><span>Ажилд тохирсон хүнийг хурдан ол</span></div>
          <div className="kpi"><b>Pipeline</b><span>Өргөдлөөс ажилд авалт хүртэл нэг дороос</span></div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */
function Dashboard({ profile, company, onCompany }) {
  const [tab, setTab] = useState("overview");
  const doLogout = useCallback(async () => { try { await signOut(); } catch { /* ignore */ } }, []);

  const NAV = [
    ["overview", "Хянах самбар", "▦"],
    ["jobs", "Ажлын зарууд", "📄"],
    ["applicants", "Өргөдөл гаргагчид", "📋"],
    ["candidates", "Нэр дэвшигчид", "👥"],
  ];

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <img src="/logo.png" alt="" className="side__logo" />
          <span>SwipeHire</span>
        </div>
        <nav className="nav">
          {NAV.map(([k, label, icon]) => (
            <button key={k} className={tab === k ? "nav__i is-on" : "nav__i"} onClick={() => setTab(k)}>
              <span className="nav__ic">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="side__foot">
          <div className="side__co">{company?.name || "Миний компани"}{company?.verified ? " ✓" : ""}</div>
          <button className="linkbtn" onClick={doLogout}>Гарах</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div className="top__title">{NAV.find((n) => n[0] === tab)?.[1]}</div>
          <div className="top__right">
            {!company?.verified && <span className="pill warn">Компани баталгаажаагүй</span>}
            <span className="who">{profile?.display_name || "Ажил олгогч"}</span>
          </div>
        </header>
        <div className="content">
          {tab === "overview" && <Overview company={company} />}
          {tab === "jobs" && <Jobs company={company} onCompany={onCompany} />}
          {tab === "applicants" && <Applicants />}
          {tab === "candidates" && <Candidates />}
        </div>
      </main>
    </div>
  );
}

function Overview({ company }) {
  const [jobs, setJobs] = useState(null);
  const [apps, setApps] = useState(null);
  const [cands, setCands] = useState(null);
  useEffect(() => {
    listMyJobs().then(setJobs).catch(() => setJobs([]));
    listCompanyApplications().then(setApps).catch(() => setApps([]));
    listPublishedCandidates({ limit: 200 }).then(setCands).catch(() => setCands([]));
  }, []);
  const activeJobs = (jobs || []).filter((j) => j.status === "active").length;
  return (
    <>
      <div className="cards">
        <Stat k="Идэвхтэй зар" v={jobs == null ? "…" : activeJobs} s={`${jobs?.length ?? 0} нийт`} />
        <Stat k="Өргөдөл" v={apps == null ? "…" : apps.length} s="бүх зард" />
        <Stat k="Нэр дэвшигчид" v={cands == null ? "…" : cands.length} s="нийтлэгдсэн" />
        <Stat k="Компани" v={company?.verified ? "Баталгаажсан" : "Хүлээгдэж буй"} s={company?.name || ""} accent={company?.verified ? "ok" : "warn"} />
      </div>
      <div className="hint">Зүүн талын цэсээс ажлын зар нэмэх, өргөдөл харах, нэр дэвшигч хайх боломжтой.</div>
    </>
  );
}

function Jobs({ company }) {
  const [rows, setRows] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const load = useCallback(() => { listMyJobs().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  const setStatus = async (id, status) => { try { await updateJob(id, { status }); load(); } catch { /* ignore */ } };

  return (
    <>
      <div className="rowbar">
        <button className="btn sm" onClick={() => setShowPost(true)} disabled={!company?.id}>＋ Ажлын зар нэмэх</button>
      </div>
      {rows == null ? <Loading /> : rows.length === 0 ? <Empty text="Зар алга. Эхний ажлын зараа нэмээрэй." /> : (
        <table className="tbl">
          <thead><tr><th>Ажлын нэр</th><th>Ангилал</th><th>Байршил</th><th>Төлөв</th><th></th></tr></thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id}>
                <td className="b">{j.title}</td><td>{j.category || "—"}</td><td>{j.location || "—"}</td>
                <td><span className={`pill ${j.status === "active" ? "ok" : j.status === "paused" ? "warn" : ""}`}>{j.status}</span></td>
                <td className="right">
                  {["active", "paused", "closed"].filter((s) => s !== j.status).map((s) => (
                    <button key={s} className="linkbtn sm" onClick={() => setStatus(j.id, s)}>{s === "active" ? "Нийтлэх" : s}</button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showPost && <PostJob companyId={company?.id} onClose={() => setShowPost(false)} onPosted={() => { setShowPost(false); load(); }} />}
    </>
  );
}

function PostJob({ companyId, onClose, onPosted }) {
  const [f, setF] = useState({ title: "", category: "", location: "", description: "", salaryMin: "", salaryMax: "", headcount: "1" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setErr(null);
    try { if (!f.title.trim()) throw new Error("Ажлын нэр оруулна уу."); await createJob({ companyId, ...f }); onPosted(); }
    catch (e) { setErr(e?.message || String(e)); } finally { setBusy(false); }
  };
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box">
        <div className="modal__head"><b>Ажлын зар нэмэх</b><button className="x" onClick={onClose}>✕</button></div>
        <label className="lbl">Ажлын нэр *</label><input className="in" value={f.title} onChange={set("title")} />
        <div className="two">
          <div><label className="lbl">Ангилал</label><input className="in" value={f.category} onChange={set("category")} /></div>
          <div><label className="lbl">Байршил</label><input className="in" value={f.location} onChange={set("location")} /></div>
        </div>
        <label className="lbl">Тайлбар</label><textarea className="in ta" value={f.description} onChange={set("description")} />
        <div className="two">
          <div><label className="lbl">Цалин доод</label><input className="in" type="number" value={f.salaryMin} onChange={set("salaryMin")} /></div>
          <div><label className="lbl">Цалин дээд</label><input className="in" type="number" value={f.salaryMax} onChange={set("salaryMax")} /></div>
        </div>
        <label className="lbl">Хүний тоо</label><input className="in" type="number" min="1" value={f.headcount} onChange={set("headcount")} />
        {err && <div className="msg err">{err}</div>}
        <button className="btn" disabled={busy} onClick={submit}>{busy ? "Нийтэлж байна…" : "Нийтлэх"}</button>
      </div>
    </div>
  );
}

function Applicants() {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => { listCompanyApplications().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  const STAT = ["submitted", "reviewing", "interview", "offer", "hired", "rejected"];
  const advance = async (id, status) => { try { await setApplicationStatus(id, status); setRows((rs) => rs.map((r) => r.id === id ? { ...r, status } : r)); } catch { /* ignore */ } };
  const viewCv = async (cid) => { const url = await getCandidateDocumentUrl({ candidateId: cid, kind: "cv" }); if (url) window.open(url, "_blank"); };
  if (rows == null) return <Loading />;
  if (rows.length === 0) return <Empty text="Өргөдөл алга. Ажлын зар нийтэлбэл эндээс харагдана." />;
  return (
    <table className="tbl">
      <thead><tr><th>Ажил</th><th>Төлөв</th><th>Огноо</th><th></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="b">{r.jobs?.title || "Ажил"}</td>
            <td><span className="pill">{r.status}</span></td>
            <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
            <td className="right">
              <button className="linkbtn sm" onClick={() => viewCv(r.candidate_id)}>CV</button>
              {STAT.filter((s) => s !== r.status).slice(0, 3).map((s) => (
                <button key={s} className="linkbtn sm" onClick={() => advance(r.id, s)}>{s}</button>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Candidates() {
  const [rows, setRows] = useState(null);
  useEffect(() => { listPublishedCandidates({ limit: 200 }).then(setRows).catch(() => setRows([])); }, []);
  const viewCv = async (id) => { const url = await getCandidateDocumentUrl({ candidateId: id, kind: "cv" }); if (url) window.open(url, "_blank"); };
  const viewVideo = async (id) => { const url = await getCandidateDocumentUrl({ candidateId: id, kind: "video" }); if (url) window.open(url, "_blank"); };
  if (rows == null) return <Loading />;
  if (rows.length === 0) return <Empty text="Нийтлэгдсэн нэр дэвшигч алга." />;
  return (
    <div className="cgrid">
      {rows.map((c) => (
        <div key={c.id} className="ccard">
          <div className="ccard__name">{c.full_name || "Нэр дэвшигч"}</div>
          <div className="ccard__meta">{c.category || "—"}{c.location ? ` · ${c.location}` : ""}</div>
          {c.salary_expectation ? <div className="ccard__sal">{money(c.salary_expectation)}</div> : null}
          {c.about && <div className="ccard__about">{String(c.about).slice(0, 120)}</div>}
          <div className="ccard__acts">
            <button className="linkbtn sm" onClick={() => viewCv(c.id)}>CV</button>
            <button className="linkbtn sm" onClick={() => viewVideo(c.id)}>Видео</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const Stat = ({ k, v, s, accent }) => (
  <div className="stat">
    <div className="stat__k">{k}</div>
    <div className={`stat__v ${accent || ""}`}>{v}</div>
    <div className="stat__s">{s}</div>
  </div>
);
const Loading = () => <div className="loading">…</div>;
const Empty = ({ text }) => <div className="empty">{text}</div>;
