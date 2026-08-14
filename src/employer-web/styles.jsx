import React from "react";

/** Desktop employer-web styles — SwipeHire brand (dark + orange). */
export function Styles() {
  return (
    <style>{`
    :root{
      --bg:#0f0e0c; --bg-2:#161310; --surface:#1c1815; --surface-2:#221d18;
      --ink:#f6f2ea; --ink-2:#d8cfc2; --dim:#9a9188; --hair:rgba(255,255,255,.09); --hair-2:rgba(255,255,255,.16);
      --accent:#FF6B35; --accent-2:#FF8A3D; --accent-deep:#E85400; --ok:#3DDC97; --warn:#FFC24B; --danger:#FF6B6B;
      --sh:0 1px 2px rgba(0,0,0,.3),0 12px 32px rgba(0,0,0,.35);
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--ink)}
    button{font-family:inherit}
    .btn{width:100%;padding:13px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:#fff;font-weight:800;font-size:15px;cursor:pointer}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .btn.sm{width:auto;padding:9px 16px;font-size:13.5px;border-radius:10px}
    .linkbtn{background:none;border:none;color:var(--accent-2);font-weight:700;cursor:pointer;font-size:13px}
    .linkbtn.sm{font-size:12px;margin-left:10px}
    .lbl{display:block;font-size:12px;color:var(--dim);font-weight:700;margin:12px 0 5px}
    .in{width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid var(--hair-2);background:var(--surface);color:var(--ink);font-size:14.5px}
    .in:focus{outline:none;border-color:var(--accent)}
    .ta{min-height:84px;resize:vertical}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .msg{font-size:13px;border-radius:10px;padding:10px 12px;margin:12px 0}
    .msg.err{color:#ffb4b4;background:rgba(255,80,80,.09);border:1px solid rgba(255,80,80,.3)}
    .msg.ok{color:var(--ok);background:rgba(61,220,151,.09);border:1px solid rgba(61,220,151,.3)}
    .pill{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.02em;padding:3px 10px;border-radius:999px;border:1px solid var(--hair-2);color:var(--dim);text-transform:capitalize}
    .pill.ok{color:var(--ok);border-color:rgba(61,220,151,.4)}
    .pill.warn{color:var(--warn);border-color:rgba(255,194,75,.4)}

    /* ── auth ── */
    .auth{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}
    @media(max-width:820px){.auth{grid-template-columns:1fr}.auth__side{display:none}}
    .auth__panel{display:flex;flex-direction:column;justify-content:center;max-width:420px;margin:0 auto;width:100%;padding:40px 32px}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px}
    .brand__logo{width:46px;height:46px;border-radius:12px;object-fit:contain}
    .brand__name{font-weight:900;font-size:20px;letter-spacing:-.02em}
    .brand__sub{font-size:12px;color:var(--dim)}
    .auth__title{font-size:27px;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}
    .auth__lead{color:var(--dim);font-size:14px;margin:0 0 22px}
    .tabs{display:flex;gap:6px;background:var(--surface);border-radius:12px;padding:4px;margin-bottom:18px}
    .tabs__b{flex:1;padding:10px;border:none;border-radius:9px;background:none;color:var(--dim);font-weight:800;font-size:14px;cursor:pointer}
    .tabs__b.is-on{background:rgba(255,107,53,.15);color:var(--accent)}
    .chk{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink-2);margin:14px 0 4px;cursor:pointer;line-height:1.5}
    .auth__foot{font-size:12.5px;color:var(--dim);text-align:center;margin-top:16px}
    .auth__side{background:radial-gradient(120% 120% at 100% 0%,rgba(255,107,53,.16),transparent 60%),var(--bg-2);display:flex;align-items:center;justify-content:center;padding:40px}
    .auth__sideinner{display:flex;flex-direction:column;gap:18px;max-width:340px}
    .kpi{background:var(--surface);border:1px solid var(--hair);border-radius:14px;padding:18px 20px}
    .kpi b{display:block;color:var(--accent-2);font-size:15px;margin-bottom:4px}
    .kpi span{color:var(--dim);font-size:13px}

    /* ── shell ── */
    .shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh}
    @media(max-width:820px){.shell{grid-template-columns:1fr}.side{display:none}}
    .side{background:var(--bg-2);border-right:1px solid var(--hair);display:flex;flex-direction:column;padding:20px 14px}
    .side__brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:17px;padding:6px 8px 22px}
    .side__logo{width:32px;height:32px;border-radius:9px;object-fit:contain}
    .nav{display:flex;flex-direction:column;gap:4px;flex:1}
    .nav__i{display:flex;align-items:center;gap:11px;padding:11px 12px;border:none;border-radius:10px;background:none;color:var(--ink-2);font-weight:700;font-size:14px;cursor:pointer;text-align:left}
    .nav__i:hover{background:var(--surface)}
    .nav__i.is-on{background:rgba(255,107,53,.13);color:var(--accent)}
    .nav__ic{width:20px;text-align:center}
    .side__foot{border-top:1px solid var(--hair);padding-top:14px;display:flex;flex-direction:column;gap:8px}
    .side__co{font-size:12.5px;color:var(--dim);font-weight:700}

    .main{display:flex;flex-direction:column;min-width:0}
    .top{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--hair)}
    .top__title{font-size:20px;font-weight:800;letter-spacing:-.01em}
    .top__right{display:flex;align-items:center;gap:12px}
    .who{font-size:13.5px;color:var(--dim);font-weight:600}
    .content{padding:26px 32px;overflow-x:auto}

    .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    @media(max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}}
    .stat{background:var(--surface);border:1px solid var(--hair);border-radius:14px;padding:18px;box-shadow:var(--sh)}
    .stat__k{font-size:11.5px;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    .stat__v{font-size:26px;font-weight:800;margin-top:7px;letter-spacing:-.01em}
    .stat__v.ok{color:var(--ok)} .stat__v.warn{color:var(--warn)}
    .stat__s{font-size:12.5px;color:var(--dim);margin-top:3px}
    .hint{color:var(--dim);font-size:13.5px;margin-top:18px}

    .rowbar{display:flex;justify-content:flex-end;margin-bottom:14px}
    .tbl{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
    .tbl th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--dim);font-weight:700;padding:10px 12px;border-bottom:1px solid var(--hair)}
    .tbl td{padding:13px 12px;border-bottom:1px solid var(--hair);color:var(--ink-2)}
    .tbl td.b{color:var(--ink);font-weight:700}
    .tbl td.right{text-align:right}
    .tbl tr:hover td{background:var(--surface)}

    .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
    .ccard{background:var(--surface);border:1px solid var(--hair);border-radius:14px;padding:16px}
    .ccard__name{font-weight:800;font-size:15px}
    .ccard__meta{font-size:12.5px;color:var(--dim);margin-top:3px}
    .ccard__sal{font-size:13px;color:var(--accent);font-weight:700;margin-top:6px}
    .ccard__about{font-size:12.5px;color:var(--ink-2);margin-top:8px;line-height:1.45}
    .ccard__acts{margin-top:12px;display:flex;gap:6px}

    .loading{color:var(--dim);padding:40px;text-align:center}
    .empty{color:var(--dim);padding:50px 20px;text-align:center;font-size:14px}

    .modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px}
    .modal__box{background:var(--bg-2);border:1px solid var(--hair-2);border-radius:18px;padding:22px;width:100%;max-width:460px;max-height:88vh;overflow-y:auto;box-shadow:var(--sh)}
    .modal__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .modal__head b{font-size:18px}
    .x{background:var(--surface);border:none;border-radius:9px;width:34px;height:34px;color:var(--dim);cursor:pointer;font-size:16px}
    `}</style>
  );
}
