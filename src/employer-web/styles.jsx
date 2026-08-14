import React from "react";

/** Desktop employer-web styles — SwipeHire brand (dark + orange), refined. */
export function Styles() {
  return (
    <style>{`
    :root{
      --bg:#100e0c; --bg-2:#15120f; --surface:#1a1611; --surface-2:#221d17;
      --ink:#f4efe7; --ink-2:#cfc7ba; --dim:#948c80; --faint:#6f6a60;
      --hair:rgba(255,255,255,.07); --hair-2:rgba(255,255,255,.13);
      --accent:#FF6B35; --accent-2:#FF8A3D; --accent-deep:#E85400; --accent-soft:rgba(255,107,53,.12);
      --ok:#39d29a; --warn:#f4bf4f; --info:#5aa0ff; --danger:#ff6b6b;
      --r:14px; --r-sm:10px; --r-lg:18px;
      --sh:0 1px 2px rgba(0,0,0,.35),0 10px 30px rgba(0,0,0,.28);
      --sh-lg:0 1px 3px rgba(0,0,0,.4),0 22px 60px rgba(0,0,0,.5);
      --ease:cubic-bezier(.2,.7,.3,1);
    }
    *{box-sizing:border-box}
    html,body{margin:0}
    body{background:var(--bg);color:var(--ink);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      -webkit-font-smoothing:antialiased;font-feature-settings:"cv02","cv03","ss01"}
    ::selection{background:var(--accent-soft)}
    button{font-family:inherit}
    .tnum{font-variant-numeric:tabular-nums}

    .btn{width:100%;padding:12px 16px;border:none;border-radius:var(--r-sm);
      background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:#fff;font-weight:700;font-size:15px;
      cursor:pointer;transition:transform .12s var(--ease),box-shadow .12s var(--ease);box-shadow:0 6px 18px rgba(255,107,53,.28)}
    .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 26px rgba(255,107,53,.36)}
    .btn:active:not(:disabled){transform:translateY(0)}
    .btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
    .btn.sm{width:auto;padding:9px 15px;font-size:13.5px}
    .linkbtn{background:none;border:none;color:var(--accent-2);font-weight:600;cursor:pointer;font-size:13px;padding:4px 6px;border-radius:7px;transition:background .12s}
    .linkbtn:hover{background:var(--accent-soft)}
    .linkbtn.sm{font-size:12px;margin-left:6px;color:var(--dim)}
    .linkbtn.sm:hover{color:var(--accent-2)}
    .lbl{display:block;font-size:11.5px;color:var(--dim);font-weight:600;letter-spacing:.02em;margin:13px 0 5px}
    .in{width:100%;padding:11px 13px;border-radius:var(--r-sm);border:1px solid var(--hair-2);
      background:var(--surface);color:var(--ink);font-size:14.5px;transition:border-color .12s,box-shadow .12s}
    .in:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
    .ta{min-height:88px;resize:vertical;line-height:1.5}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .msg{font-size:13px;border-radius:var(--r-sm);padding:10px 12px;margin:12px 0}
    .msg.err{color:#ffb4b4;background:rgba(255,80,80,.09);border:1px solid rgba(255,80,80,.28)}
    .msg.ok{color:var(--ok);background:rgba(57,210,154,.09);border:1px solid rgba(57,210,154,.28)}
    .pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;letter-spacing:.01em;
      padding:3px 10px;border-radius:999px;border:1px solid var(--hair-2);color:var(--dim);text-transform:capitalize;white-space:nowrap}
    .pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.9}
    .pill.ok{color:var(--ok);border-color:rgba(57,210,154,.35);background:rgba(57,210,154,.08)}
    .pill.warn{color:var(--warn);border-color:rgba(244,191,79,.35);background:rgba(244,191,79,.08)}

    /* ── auth ── */
    .auth{min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
    @media(max-width:860px){.auth{grid-template-columns:1fr}.auth__side{display:none}}
    .auth__panel{display:flex;flex-direction:column;justify-content:center;max-width:400px;margin:0 auto;width:100%;padding:40px 34px}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:30px}
    .brand__logo{width:44px;height:44px;border-radius:12px;object-fit:contain}
    .brand__name{font-weight:800;font-size:19px;letter-spacing:-.02em}
    .brand__sub{font-size:12px;color:var(--dim);margin-top:1px}
    .auth__title{font-size:26px;font-weight:800;letter-spacing:-.025em;margin:0 0 6px;text-wrap:balance}
    .auth__lead{color:var(--dim);font-size:14px;margin:0 0 22px;line-height:1.5}
    .tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--hair);border-radius:11px;padding:4px;margin-bottom:16px}
    .tabs__b{flex:1;padding:9px;border:none;border-radius:8px;background:none;color:var(--dim);font-weight:700;font-size:13.5px;cursor:pointer;transition:.12s}
    .tabs__b.is-on{background:var(--accent-soft);color:var(--accent)}
    .chk{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--ink-2);margin:14px 0 4px;cursor:pointer;line-height:1.5}
    .chk input{margin-top:2px;accent-color:var(--accent)}
    .auth__foot{font-size:12.5px;color:var(--dim);text-align:center;margin-top:18px;line-height:1.5}
    .auth__side{position:relative;overflow:hidden;background:var(--bg-2);display:flex;align-items:center;justify-content:center;padding:44px;border-left:1px solid var(--hair)}
    .auth__side::before{content:"";position:absolute;inset:0;background:radial-gradient(90% 70% at 90% 0%,rgba(255,107,53,.20),transparent 55%)}
    .auth__sideinner{position:relative;display:flex;flex-direction:column;gap:14px;max-width:330px}
    .kpi{background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);padding:18px 20px;box-shadow:var(--sh)}
    .kpi b{display:block;color:var(--accent-2);font-size:15px;margin-bottom:4px;letter-spacing:-.01em}
    .kpi span{color:var(--dim);font-size:13px;line-height:1.45}

    /* ── shell ── */
    .shell{display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100vh}
    @media(max-width:860px){.shell{grid-template-columns:1fr}.side{display:none}}
    .side{background:var(--bg-2);border-right:1px solid var(--hair);display:flex;flex-direction:column;padding:18px 12px;position:sticky;top:0;height:100vh}
    .side__brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:16px;letter-spacing:-.01em;padding:6px 8px 20px}
    .side__logo{width:30px;height:30px;border-radius:8px;object-fit:contain}
    .nav{display:flex;flex-direction:column;gap:2px;flex:1}
    .nav__i{display:flex;align-items:center;gap:11px;padding:10px 12px;border:none;border-radius:var(--r-sm);
      background:none;color:var(--ink-2);font-weight:600;font-size:14px;cursor:pointer;text-align:left;transition:.12s;position:relative}
    .nav__i:hover{background:var(--surface);color:var(--ink)}
    .nav__i.is-on{background:var(--accent-soft);color:var(--accent);font-weight:700}
    .nav__i.is-on::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--accent)}
    .nav__ic{width:20px;text-align:center;font-size:15px}
    .side__foot{border-top:1px solid var(--hair);padding:14px 8px 4px;display:flex;flex-direction:column;gap:9px}
    .side__co{font-size:12.5px;color:var(--ink-2);font-weight:700;letter-spacing:-.01em}

    .main{display:flex;flex-direction:column;min-width:0}
    .top{display:flex;align-items:center;justify-content:space-between;padding:20px 34px;border-bottom:1px solid var(--hair);position:sticky;top:0;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(10px);z-index:5}
    .top__title{font-size:20px;font-weight:800;letter-spacing:-.02em}
    .top__right{display:flex;align-items:center;gap:12px}
    .who{font-size:13.5px;color:var(--dim);font-weight:600}
    .content{padding:28px 34px 60px;overflow-x:auto}

    .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    @media(max-width:1000px){.cards{grid-template-columns:repeat(2,1fr)}}
    .stat{position:relative;background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);padding:18px 18px 16px;box-shadow:var(--sh);overflow:hidden;transition:border-color .15s,transform .15s var(--ease)}
    .stat:hover{border-color:var(--hair-2);transform:translateY(-2px)}
    .stat::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),transparent)}
    .stat__k{font-size:11px;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
    .stat__v{font-size:28px;font-weight:800;margin-top:8px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
    .stat__v.ok{color:var(--ok)} .stat__v.warn{color:var(--warn)}
    .stat__s{font-size:12.5px;color:var(--faint);margin-top:3px}
    .hint{color:var(--dim);font-size:13.5px;margin-top:20px;line-height:1.5}

    .rowbar{display:flex;justify-content:flex-end;margin-bottom:16px}
    .panel{background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh)}
    .tbl{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
    .tbl th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);font-weight:700;padding:12px 16px;border-bottom:1px solid var(--hair);background:var(--bg-2)}
    .tbl td{padding:14px 16px;border-bottom:1px solid var(--hair);color:var(--ink-2)}
    .tbl tr:last-child td{border-bottom:none}
    .tbl td.b{color:var(--ink);font-weight:700;letter-spacing:-.01em}
    .tbl td.right{text-align:right;white-space:nowrap}
    .tbl tbody tr{transition:background .1s}
    .tbl tbody tr:hover td{background:var(--surface-2)}

    .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
    .ccard{background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);padding:17px 18px;box-shadow:var(--sh);transition:border-color .15s,transform .15s var(--ease)}
    .ccard:hover{border-color:var(--hair-2);transform:translateY(-2px)}
    .ccard__name{font-weight:800;font-size:15.5px;letter-spacing:-.01em}
    .ccard__meta{font-size:12.5px;color:var(--dim);margin-top:3px}
    .ccard__sal{display:inline-block;font-size:12.5px;color:var(--accent);font-weight:700;margin-top:9px;background:var(--accent-soft);padding:3px 9px;border-radius:999px}
    .ccard__about{font-size:12.5px;color:var(--ink-2);margin-top:10px;line-height:1.5}
    .ccard__acts{margin-top:13px;display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--hair)}

    .loading{color:var(--dim);padding:50px;text-align:center;font-size:22px;letter-spacing:2px}
    .empty{color:var(--dim);padding:56px 20px;text-align:center;font-size:14px;line-height:1.6}

    .modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}
    .modal__box{background:var(--bg-2);border:1px solid var(--hair-2);border-radius:var(--r-lg);padding:24px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;box-shadow:var(--sh-lg)}
    .modal__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
    .modal__head b{font-size:19px;letter-spacing:-.02em}
    .x{background:var(--surface);border:1px solid var(--hair);border-radius:9px;width:34px;height:34px;color:var(--dim);cursor:pointer;font-size:15px;transition:.12s}
    .x:hover{color:var(--ink);border-color:var(--hair-2)}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
    `}</style>
  );
}
