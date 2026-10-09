"use strict";
/* Strikkeplan – opskriften skrevet ind trin for trin.
   Hun skriver tallene for SIN størrelse. Hvert tryk på + ved Pind flytter planen én pind frem,
   så appen ved hvilket trin og hvilken pind hun er på, hvad hun skal gøre, og hvor mange masker der er. */

const PT = {
  note: "Instruktion",
  pinde: "Strik pinde",
  gentag: "Gentag mønster",
  maal: "Strik til mål",
  jaevnt: "Tag jævnt ud/ind",
  hver: "Ud/ind med mellemrum"
};
const PT_HELP = {
  note: "En handling uden at tælle pinde, fx \"Slå 96 masker op\", \"Sæt maskerne på en tråd\" eller \"Luk af\".",
  pinde: "Et fast antal pinde, fx \"Strik 10 pinde rib (2 ret, 2 vrang)\".",
  gentag: "Nogle pinde der gentages, fx et mønster på 4 pinde, der strikkes 6 gange. Skriv én linje pr. pind.",
  maal: "Strik til arbejdet måler et antal cm. Appen tæller pindene, og hvis du har skrevet strikkefastheden, regner den ud hvor mange der ca. mangler.",
  jaevnt: "Tag et antal masker ud eller ind jævnt fordelt på én pind. Appen regner ud præcis hvordan.",
  hver: "Fx \"Tag 1 m ind i hver side på hver 4. pind i alt 6 gange\". Appen siger til, på hvilke pinde du skal tage ud eller ind."
};

function ensurePlan(p) { if (!p.plan) p.plan = { work: "frem", rowsPer10: "", size: 0, steps: [], i: 0, row: 0 }; return p.plan; }

/* Opskrifter skriver størrelser som "96 (104) 112" eller "96-104-112". Vælg tallet for hendes størrelse. */
function pickSize(text, idx) {
  idx = idx | 0;
  const NUM = "\\d+(?:[.,]\\d+)?";
  text = text.replace(new RegExp(`${NUM}(?:\\s*\\(\\s*${NUM}\\s*\\)\\s*(?:${NUM})?)+`, "g"), m => {
    const nums = m.match(/\d+(?:[.,]\d+)?/g);
    return nums.length > 1 ? nums[Math.min(idx, nums.length - 1)] : m;
  });
  text = text.replace(new RegExp(`\\b${NUM}(?:-${NUM}){2,}\\b`, "g"), m => { const nums = m.split("-"); return nums[Math.min(idx, nums.length - 1)]; });
  return text;
}
const W = plan => plan.work === "rundt" ? { one: "omgang", many: "omgange", Cap: "Omgang", short: "omg." } : { one: "pind", many: "pinde", Cap: "Pind", short: "pind" };
const sgn = s => s.dir === "ind" ? -1 : 1;

function stepLen(s) {
  switch (s.type) {
    case "pinde": return Math.max(1, s.n | 0);
    case "gentag": return Math.max(1, (s.lines || []).length) * Math.max(1, s.times | 0);
    case "hver": return Math.max(1, s.every | 0) * Math.max(1, s.times | 0);
    case "jaevnt": return 1;
    default: return 0; // note = ingen pinde, maal = ukendt
  }
}
function isShape(s, r) { const e = Math.max(1, s.every | 0); return s.first === "efter" ? (r + 1) % e === 0 : r % e === 0; }
function shapesDone(s, row) { let k = 0; for (let r = 0; r < row; r++) if (isShape(s, r)) k++; return k; }

function stitchesBefore(plan, i) {
  let st = null;
  for (let k = 0; k < i && k < plan.steps.length; k++) {
    const s = plan.steps[k];
    if (s.type === "note" && num(s.set) > 0) st = num(s.set);
    else if (st !== null) {
      if (s.type === "jaevnt") st += sgn(s) * (s.n | 0);
      if (s.type === "hver") st += sgn(s) * (s.per | 0) * (s.times | 0);
    }
  }
  return st;
}
function stitchesAfterStep(plan, i) { return stitchesBefore(plan, i + 1); }
function stitchesNow(plan) {
  const s = plan.steps[plan.i], st = stitchesBefore(plan, plan.i);
  if (!s) return st;
  if (s.type === "note" && num(s.set) > 0) return null;
  if (st === null) return null;
  if (s.type === "jaevnt" && plan.row >= 1) return st + sgn(s) * (s.n | 0);
  if (s.type === "hver") return st + sgn(s) * (s.per | 0) * shapesDone(s, plan.row);
  return st;
}

/* Jævnt fordelt – frem og tilbage (kantmasker til sidst/først) */
function evenlyFlat(S0, n, mode) {
  S0 = Math.floor(S0); n = Math.floor(n);
  if (!(S0 > 0) || !(n > 0)) return null;
  if (mode === "ud") {
    const base = Math.floor(S0 / (n + 1)), first = S0 - n * base;
    return { text: `Strik ${first}, *tag 1 ud, strik ${base}* ${n} gange`, result: S0 + n };
  }
  if (n * 2 > S0) return { err: "Du kan højst tage halvt så mange ind, som du har masker." };
  const g = Math.floor(S0 / (n + 1)), rest = S0 - n * g;
  const step = g - 2 > 0 ? `strik ${g - 2}, strik 2 sammen` : "strik 2 sammen";
  return { text: `*${step}* ${n} gange, strik de sidste ${rest}`, result: S0 - n };
}
function evenlyFor(plan, before, s) {
  const mode = s.dir === "ud" ? "ud" : "ind";
  return plan.work === "rundt" ? evenly(before, s.n, mode) : evenlyFlat(before, s.n, mode);
}

function stepSummary(plan, s) {
  const w = W(plan);
  switch (s.type) {
    case "note": return s.text || "Instruktion";
    case "pinde": return `${s.n} ${s.n == 1 ? w.one : w.many}${s.text ? ": " + s.text : ""}`;
    case "gentag": return `${(s.lines || []).length} ${w.many} × ${s.times} gange${s.text ? " – " + s.text : ""}`;
    case "maal": return `Strik til arbejdet måler ${fmtNum(num(s.cm))} cm${s.text ? " – " + s.text : ""}`;
    case "jaevnt": return `Tag ${s.n} m ${s.dir} jævnt fordelt`;
    case "hver": return `Tag ${s.per} m ${s.dir} på hver ${s.every}. ${w.short} × ${s.times}${s.text ? " – " + s.text : ""}`;
  }
  return "";
}

function planNow(p) {
  const plan = p.plan, w = W(plan), s = plan.steps[plan.i], row = plan.row;
  if (!s) return { done: true };
  const out = { s, section: s.section || "", shaping: false };
  switch (s.type) {
    case "note":
      out.big = s.text || "Instruktion";
      out.sub = "Tryk \"Færdig med trinnet\", når det er gjort.";
      break;
    case "pinde":
      out.big = s.text || `Strik ${s.n} ${w.many}`;
      out.sub = `${w.Cap} ${row + 1} af ${s.n}`;
      break;
    case "gentag": {
      const L = Math.max(1, s.lines.length), li = row % L;
      out.big = s.lines[li] || s.text;
      out.sub = `${w.Cap} ${li + 1} af ${L} i mønsteret · gentagelse ${Math.floor(row / L) + 1} af ${s.times}`;
      if (s.text) out.note = s.text;
      break;
    }
    case "maal": {
      out.big = `Strik til arbejdet måler ${fmtNum(num(s.cm))} cm`;
      if (s.text) out.note = s.text;
      let sub = `${row} ${row === 1 ? w.one : w.many} strikket i dette trin`;
      const rp = num(plan.rowsPer10);
      if (rp > 0 && num(s.cm) > 0) {
        const need = Math.round(num(s.cm) * rp / 10), left = need - row;
        sub += left > 0 ? ` · ca. ${left} ${w.many} igen – mål efter` : " · mål nu – du er nok der";
      }
      out.sub = sub;
      out.open = true;
      break;
    }
    case "jaevnt": {
      const before = stitchesBefore(plan, plan.i);
      const r = before ? evenlyFor(plan, before, s) : null;
      out.shaping = true;
      out.big = !before ? `Tag ${s.n} m ${s.dir} jævnt fordelt` : r.err ? r.err : r.text;
      out.sub = before && !r.err ? `Én ${w.one} · ${before} → ${r.result} masker` : "Skriv antal masker efter opslagning i planen, så regner appen det ud.";
      if (s.text) out.note = s.text;
      break;
    }
    case "hver": {
      const len = stepLen(s), sh = isShape(s, row), k = shapesDone(s, row);
      out.shaping = sh;
      const verb = s.dir === "ind" ? "Tag ind" : "Tag ud";
      out.big = sh ? `${verb} ${s.per} m på denne ${w.one}${s.text ? " – " + s.text : ""}` : `Strik uden at tage ${s.dir}`;
      let nxt = 0; for (let r = row + 1; r < len; r++) { nxt++; if (isShape(s, r)) break; }
      out.sub = `${w.Cap} ${row + 1} af ${len} · ${s.dir === "ind" ? "indtagning" : "udtagning"} ${sh ? k + 1 : k} af ${s.times}` + (!sh && k < s.times ? ` · næste om ${nxt} ${nxt === 1 ? w.one : w.many}` : "");
      if (!sh && s.text) out.note = s.text;
      break;
    }
  }
  out.stitches = stitchesNow(plan);
  const n = plan.steps[plan.i + 1];
  out.next = n ? stepSummary(plan, n) : null;
  return out;
}
function planProgress(plan) {
  let total = 0, done = 0;
  plan.steps.forEach((s, k) => {
    let L = stepLen(s);
    if (s.type === "maal") { const rp = num(plan.rowsPer10); L = rp > 0 ? Math.round(num(s.cm) * rp / 10) : (s._rows || (k === plan.i ? plan.row : 0)); }
    if (s.type === "note") L = 1;
    total += L;
    if (k < plan.i) done += L;
    else if (k === plan.i) done += Math.min(L, plan.row);
  });
  return total ? Math.min(1, done / total) : 0;
}

/* Kaldes fra mainPlus / mainMinus */
function planStep(p, d) {
  const plan = p.plan;
  if (!plan || !plan.steps.length) return null;
  const w = W(plan);
  if (d > 0) {
    if (plan.i >= plan.steps.length) return null;
    let s = plan.steps[plan.i];
    if (s.type === "note") { plan.i++; plan.row = 0; s = plan.steps[plan.i]; if (!s) return { msg: "Hele planen er strikket!", buzz: [40, 60, 40, 60, 80] }; }
    plan.row++;
    if (s.type === "maal") s._rows = plan.row;
    const L = stepLen(s);
    if (L && plan.row >= L) {
      plan.i++; plan.row = 0;
      const n = plan.steps[plan.i];
      return n ? { msg: `Trin færdigt ✓ Næste: ${stepSummary(plan, n)}`, buzz: [40, 60, 40] } : { msg: "Hele planen er strikket!", buzz: [40, 60, 40, 60, 80] };
    }
    if (s.type === "hver" && isShape(s, plan.row)) return { msg: `Næste ${w.one}: ${s.dir === "ind" ? "tag ind" : "tag ud"}!`, buzz: [70, 50, 70] };
    return null;
  }
  if (plan.row > 0) { plan.row--; const s = plan.steps[plan.i]; if (s && s.type === "maal") s._rows = plan.row; }
  else if (plan.i > 0) {
    plan.i--;
    const s = plan.steps[plan.i], L = stepLen(s);
    plan.row = s.type === "note" ? 0 : L ? L - 1 : Math.max(0, (s._rows || 1) - 1);
  }
  return null;
}

/* ---------- Kort på projektsiden ---------- */
function planCardHTML(p) {
  const plan = p.plan;
  if (!plan || !plan.steps.length) {
    return `<section class="card plancard empty" style="--accent:var(--amber)">
      <div class="head"><h2>Strikkeplan</h2></div>
      <div class="muted">Skriv opskriften ind trin for trin. Så viser appen præcis, hvad du skal gøre på hver pind, hvornår du skal tage ind eller ud, og hvor langt du er.</div>
      <a class="btn go wide" href="#/plan/${p.id}">Lav strikkeplan</a>
    </section>`;
  }
  const pct = Math.round(planProgress(plan) * 100), now = planNow(p);
  const bar = `<div class="pbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
  if (now.done) {
    return `<section class="card plancard" style="--accent:var(--amber)">
      <div class="head"><h2>Strikkeplan</h2><a class="chip ghost" href="#/plan/${p.id}">Rediger</a></div>${bar}
      <div class="now"><div class="big">Hele planen er strikket!</div><div class="sub">Godt gået. Husk at hæfte ender.</div></div>
      <div class="grid2">${p.status !== "faerdig" ? `<button class="btn go" data-act="pStatus" data-k="faerdig">Marker projektet færdigt</button>` : "<span></span>"}<button class="btn" data-act="planPrev">‹ Tilbage</button></div>
    </section>`;
  }
  return `<section class="card plancard" style="--accent:var(--amber)">
    <div class="head"><h2>Strikkeplan</h2><a class="chip ghost" href="#/plan/${p.id}">Rediger</a></div>
    <div class="pmeta"><span>Trin ${plan.i + 1} af ${plan.steps.length}${now.section ? " · " + esc(now.section) : ""}</span><span>${pct}%</span></div>
    ${bar}
    <div class="now${now.shaping ? " shaping" : ""}">
      <div class="big">${esc(now.big)}</div>
      ${now.note ? `<div class="note">${esc(now.note)}</div>` : ""}
      <div class="sub">${esc(now.sub)}</div>
    </div>
    ${now.stitches ? `<div class="stpill">Masker på pinden: <b>${now.stitches}</b></div>` : ""}
    ${now.next ? `<div class="nextup"><span>Næste trin</span>${esc(now.next)}</div>` : `<div class="nextup"><span>Næste trin</span>Planen er færdig efter dette trin</div>`}
    <div class="grid2">
      <button class="btn" data-act="planPrev"${plan.i === 0 && plan.row === 0 ? " disabled" : ""}>‹ Forrige trin</button>
      <button class="btn${now.s.type === "note" || now.open ? " go" : ""}" data-act="planNext">${now.s.type === "note" ? "Færdig med trinnet ✓" : now.open ? "Målet er nået ✓" : "Næste trin ›"}</button>
    </div>
    <div class="small muted">Tryk + ved Pind for hver ${W(plan).one}, du strikker – så følger planen med.</div>
  </section>`;
}
ACT.planNext = () => {
  const p = P(), plan = p.plan, s = plan.steps[plan.i];
  if (!s) return;
  if (s.type === "maal") s._rows = plan.row;
  plan.i++; plan.row = 0;
  touch(p); buzz(20); rerenderKeepScroll();
  const n = plan.steps[plan.i];
  toast(n ? "Næste: " + stepSummary(plan, n) : "Hele planen er strikket!");
};
ACT.planPrev = () => {
  const p = P(), plan = p.plan;
  if (plan.row > 0) plan.row = 0; else if (plan.i > 0) { plan.i--; plan.row = 0; }
  touch(p); rerenderKeepScroll();
};

/* ---------- Redigering af planen ---------- */
function viewPlan(v) {
  const p = P();
  if (!p) { go("#/projekter"); return; }
  const plan = ensurePlan(p), w = W(plan);
  setTitle("Strikkeplan");
  const pat = S.patterns.find(x => x.id === p.patternId);
  let lastSec = null;
  const rows = plan.steps.map((s, k) => {
    const sec = s.section || "";
    const head = sec !== lastSec && sec ? `<div class="sechead">${esc(sec)}</div>` : "";
    lastSec = sec;
    const after = stitchesAfterStep(plan, k);
    const state = k < plan.i ? "done" : k === plan.i ? "cur" : "";
    return `${head}<button class="step ${state}" data-act="stepEdit" data-k="${k}">
      <span class="no">${k < plan.i ? "✓" : k + 1}</span>
      <span class="tx"><span class="ty">${PT[s.type]}${k === plan.i ? " · du er her" : ""}</span><b>${esc(stepSummary(plan, s))}</b></span>
      ${after !== null ? `<span class="aft">${after} m</span>` : ""}
    </button>`;
  }).join("");
  v.innerHTML = `
    <div class="row"><a class="chip ghost" href="#/projekt/${p.id}">‹ ${esc(p.name)}</a></div>
    <section class="card" style="--accent:var(--amber)">
      <div class="head"><h2>Opsætning</h2></div>
      <div class="chips"><button class="chip${plan.work === "frem" ? " on" : ""}" data-act="planWork" data-k="frem">Frem og tilbage</button><button class="chip${plan.work === "rundt" ? " on" : ""}" data-act="planWork" data-k="rundt">Rundt</button></div>
      <label class="f">${w.Cap === "Pind" ? "Pinde" : "Omgange"} pr. 10 cm (fra strikkefastheden – valgfrit)<input type="number" id="pl-rp" inputmode="decimal" value="${esc(plan.rowsPer10)}" placeholder="F.eks. 30"></label>
      <label class="f">Din størrelse i opskriften</label>
      <div class="chips">${[1, 2, 3, 4, 5, 6].map(n => `<button class="chip${(plan.size | 0) === n - 1 ? " on" : ""}" data-act="planSize" data-k="${n - 1}">${n}.</button>`).join("")}</div>
      <div class="small muted">Står der fx "Størrelse S (M) L" og du strikker M, så vælg 2. Når du henter tekst fra opskriften, tager appen selv det rigtige tal – "Slå 96 (104) 112 m op" bliver til "Slå 104 m op". Skriver du selv trin, så brug tallene for din størrelse.</div>
    </section>
    <section class="card" style="--accent:var(--primary)">
      <div class="head"><h2>Trin</h2><span class="small muted">${plan.steps.length} trin</span></div>
      ${plan.steps.length ? `<div class="steps">${rows}</div>` : `<div class="muted">Ingen trin endnu. Start fx med "Slå op" som en instruktion med antal masker.</div>`}
      <button class="btn go wide" data-act="stepEdit" data-k="new">+ Tilføj trin</button>
      ${pat ? `<button class="btn wide" data-act="planImport">Hent tekst fra opskriften</button>` : `<div class="small muted">Tip: Knyt en PDF-opskrift til projektet, så kan du hente teksten direkte herind.</div>`}
    </section>
    ${plan.steps.length ? `<div class="grid2"><button class="btn" data-act="planRestart">Start forfra</button><button class="btn" data-act="planDelete">Slet plan</button></div>` : ""}`;
  const rp = $("#pl-rp", v);
  rp.onchange = () => { plan.rowsPer10 = num(rp.value, 0) || ""; touch(p); };
}
ACT.planSize = a => { const p = P(); ensurePlan(p).size = +a.dataset.k; touch(p); rerenderKeepScroll(); };
ACT.planWork = a => { const p = P(); ensurePlan(p).work = a.dataset.k; touch(p); rerenderKeepScroll(); };
ACT.planRestart = () => confirmSheet("Start planen forfra fra trin 1?", "Ja, start forfra", () => { const p = P(); p.plan.i = 0; p.plan.row = 0; p.plan.steps.forEach(s => delete s._rows); touch(p); rerenderKeepScroll(); });
ACT.planDelete = () => confirmSheet("Slet hele strikkeplanen?", "Ja, slet", () => { const p = P(); delete p.plan; touch(p); go("#/projekt/" + p.id); });

const blankStep = type => ({ id: uid(), type, section: "", text: "", n: 10, lines: [], times: 4, cm: "", dir: "ind", per: 2, every: 4, first: "start", set: "" });

ACT.stepEdit = a => openStepSheet(P(), a.dataset.k === "new" ? null : +a.dataset.k);
function openStepSheet(p, k, preset) {
  const plan = ensurePlan(p), w = W(plan);
  const isNew = k === null;
  const s = isNew ? { ...blankStep("note"), ...(preset || {}), section: preset?.section || (plan.steps[plan.steps.length - 1]?.section || "") } : { ...plan.steps[k], lines: [...(plan.steps[k].lines || [])] };
  const secs = [...new Set(plan.steps.map(x => x.section).filter(Boolean))];
  const idx = isNew ? plan.steps.length : k;
  sheet(`<h3>${isNew ? "Nyt trin" : "Trin " + (k + 1)}</h3>
    <div class="chips wrap" id="ss-types">${Object.entries(PT).map(([t, n]) => `<button class="chip${s.type === t ? " on" : ""}" data-t="${t}">${n}</button>`).join("")}</div>
    <div class="small muted" id="ss-help"></div>
    <div class="stack" id="ss-fields"></div>
    <label class="f">Afsnit (valgfrit)<input type="text" id="ss-sec" list="ss-secs" value="${esc(s.section)}" placeholder="F.eks. Ribkant, Bul, Ærmer"></label>
    <datalist id="ss-secs">${secs.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="result" id="ss-prev" hidden></div>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="ss-ok">Gem</button></div>
    ${isNew ? "" : `<div class="grid2"><button class="btn" id="ss-up"${k === 0 ? " disabled" : ""}>↑ Flyt op</button><button class="btn" id="ss-down"${k === plan.steps.length - 1 ? " disabled" : ""}>↓ Flyt ned</button></div>
      <div class="grid2"><button class="btn" id="ss-copy">Kopiér trin</button><button class="btn" id="ss-del">Slet trin</button></div>
      <button class="btn" id="ss-here">Jeg er her nu</button>`}`,
    (el, close) => {
      const F = () => $("#ss-fields", el);
      const field = (id, label, val, attrs = "") => `<label class="f">${label}<input id="${id}" value="${esc(val)}" ${attrs}></label>`;
      const dirChips = () => `<div class="chips"><button class="chip${s.dir === "ind" ? " on" : ""}" data-dir="ind">Tag ind</button><button class="chip${s.dir === "ud" ? " on" : ""}" data-dir="ud">Tag ud</button></div>`;
      const read = () => {
        const g = id => { const e = $("#" + id, el); return e ? e.value : undefined; };
        if (g("ss-text") !== undefined) s.text = g("ss-text").trim();
        if (g("ss-n") !== undefined) s.n = Math.max(1, parseInt(g("ss-n")) || 1);
        if (g("ss-times") !== undefined) s.times = Math.max(1, parseInt(g("ss-times")) || 1);
        if (g("ss-cm") !== undefined) s.cm = num(g("ss-cm"), 0) || "";
        if (g("ss-per") !== undefined) s.per = Math.max(1, parseInt(g("ss-per")) || 1);
        if (g("ss-every") !== undefined) s.every = Math.max(1, parseInt(g("ss-every")) || 1);
        if (g("ss-set") !== undefined) s.set = num(g("ss-set"), 0) || "";
        if (g("ss-first") !== undefined) s.first = g("ss-first");
        if (g("ss-lines") !== undefined) s.lines = g("ss-lines").split("\n").map(x => x.trim()).filter(Boolean);
        s.section = $("#ss-sec", el).value.trim();
      };
      const preview = () => {
        read();
        const pv = $("#ss-prev", el);
        let t = "";
        const before = stitchesBefore(plan, idx);
        if (s.type === "jaevnt") {
          const r = before ? evenlyFor(plan, before, s) : null;
          t = !before ? "Appen kender ikke antal masker før dette trin endnu. Tilføj et \"Slå op\"-trin med antal masker først." : r.err ? r.err : `<big>${r.result} masker bagefter</big>${esc(r.text)}`;
        } else if (s.type === "hver") {
          t = `<big>${stepLen(s)} ${w.many} i alt</big>Du tager ${s.dir} ${s.times} gange${before ? ` · ${before} → ${before + sgn(s) * s.per * s.times} masker` : ""}`;
        } else if (s.type === "gentag") {
          t = `<big>${stepLen(s)} ${w.many} i alt</big>${s.lines.length} ${w.many} × ${s.times} gange`;
        } else if (s.type === "maal" && num(plan.rowsPer10) > 0 && num(s.cm) > 0) {
          t = `<big>ca. ${Math.round(num(s.cm) * num(plan.rowsPer10) / 10)} ${w.many}</big>ud fra din strikkefasthed – mål altid efter`;
        }
        pv.hidden = !t; pv.innerHTML = t;
      };
      const draw = () => {
        $("#ss-help", el).textContent = PT_HELP[s.type];
        let h = "";
        const textLabel = { note: "Hvad skal du gøre?", pinde: "Hvordan strikkes pindene?", gentag: "Navn på mønsteret (valgfrit)", maal: "Hvordan strikkes der? (valgfrit)", jaevnt: "Note (valgfrit)", hver: "Hvordan tages der ind/ud? (valgfrit)" }[s.type];
        const ph = { note: "F.eks. Slå 96 masker op på rundpind 4 mm", pinde: "F.eks. Rib: *2 ret, 2 vrang*", gentag: "F.eks. Hulmønster", maal: "F.eks. Glatstrik", jaevnt: "", hver: "F.eks. 2 m inden for kanten i hver side" }[s.type];
        h += `<label class="f">${textLabel}<textarea id="ss-text" rows="2" placeholder="${esc(ph)}">${esc(s.text)}</textarea></label>`;
        if (s.type === "note") h += field("ss-set", "Antal masker efter dette trin (valgfrit – fx efter opslagning)", s.set, 'type="number" inputmode="numeric" placeholder="F.eks. 96"');
        if (s.type === "pinde") h += field("ss-n", `Antal ${w.many}`, s.n, 'type="number" inputmode="numeric" min="1"');
        if (s.type === "gentag") h += `<label class="f">Mønsterets ${w.many} – én linje pr. ${w.one}<textarea id="ss-lines" rows="4" placeholder="${w.Cap} 1: ret&#10;${w.Cap} 2: vrang&#10;${w.Cap} 3: *1 ret, 1 omslag*&#10;${w.Cap} 4: vrang">${esc(s.lines.join("\n"))}</textarea></label>` + field("ss-times", "Gentag mønsteret (antal gange)", s.times, 'type="number" inputmode="numeric" min="1"');
        if (s.type === "maal") h += field("ss-cm", "Arbejdet skal måle (cm)", s.cm, 'type="number" inputmode="decimal" placeholder="F.eks. 30"');
        if (s.type === "jaevnt") h += dirChips() + field("ss-n", "Antal masker", s.n, 'type="number" inputmode="numeric" min="1"');
        if (s.type === "hver") h += dirChips() + `<div class="grid2">${field("ss-per", "Masker pr. gang", s.per, 'type="number" inputmode="numeric" min="1"')}${field("ss-every", `På hver … ${w.short}`, s.every, 'type="number" inputmode="numeric" min="1"')}</div>` + field("ss-times", "I alt (antal gange)", s.times, 'type="number" inputmode="numeric" min="1"') +
          `<label class="f">Første gang<select id="ss-first"><option value="start"${s.first !== "efter" ? " selected" : ""}>På første ${w.one} i trinnet</option><option value="efter"${s.first === "efter" ? " selected" : ""}>Efter ${s.every} ${w.many} (på ${w.one} ${s.every})</option></select></label>` +
          `<div class="small muted">"I hver side" betyder typisk 2 masker pr. gang (1 i hver side).</div>`;
        F().innerHTML = h;
        $$("[data-dir]", el).forEach(b => b.onclick = () => { read(); s.dir = b.dataset.dir; draw(); });
        $$("input,textarea,select", F()).forEach(i => i.addEventListener("input", preview));
        preview();
      };
      $$("#ss-types [data-t]", el).forEach(b => b.onclick = () => { read(); s.type = b.dataset.t; $$("#ss-types .chip", el).forEach(c => c.classList.toggle("on", c === b)); draw(); });
      $("#ss-sec", el).addEventListener("input", preview);
      draw();
      const commit = () => {
        read();
        if (s.type === "gentag" && !s.lines.length) s.lines = [s.text || "Mønster"];
        if (isNew) plan.steps.push(s); else plan.steps[k] = s;
        touch(p); close(); rerenderKeepScroll();
      };
      $("#ss-ok", el).onclick = commit;
      if (!isNew) {
        const mv = d => { read(); plan.steps[k] = s; const t = plan.steps.splice(k, 1)[0]; plan.steps.splice(k + d, 0, t); if (plan.i === k) plan.i = k + d; else if (plan.i === k + d) plan.i = k; touch(p); close(); rerenderKeepScroll(); };
        $("#ss-up", el).onclick = () => mv(-1);
        $("#ss-down", el).onclick = () => mv(1);
        $("#ss-copy", el).onclick = () => { read(); plan.steps.splice(k + 1, 0, { ...s, id: uid(), lines: [...s.lines] }); delete plan.steps[k + 1]._rows; touch(p); close(); rerenderKeepScroll(); toast("Trinnet er kopieret"); };
        $("#ss-del", el).onclick = () => { plan.steps.splice(k, 1); if (plan.i > k) plan.i--; if (plan.i >= plan.steps.length) { plan.i = Math.max(0, plan.steps.length); plan.row = 0; } touch(p); close(); rerenderKeepScroll(); };
        $("#ss-here", el).onclick = () => { plan.i = k; plan.row = 0; touch(p); close(); rerenderKeepScroll(); toast("Planen står nu på trin " + (k + 1)); };
      }
    });
}

/* ---------- Gæt trin ud fra opskriftens tekst ---------- */
function guessStep(text) {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const s = blankStep("note"); s.text = text.trim();
  const int = re => { const m = t.match(re); return m ? parseInt(m[1]) : null; };
  const dir = /tag\w*\s+(\d+\s*m\w*\s+)?ud|udtag|øg|øk/.test(t) ? "ud" : "ind";
  if (/jævnt|fordelt/.test(t) && /(\d+)\s*m/.test(t)) {
    s.type = "jaevnt"; s.dir = dir;
    s.n = int(/(?:tag\w*|tage)\s*(\d+)\s*m/) || int(/(\d+)\s*m(?:asker)?\s*(?:ud|ind)/) || int(/(\d+)\s*m/) || 1;
    s.text = "";
    return s;
  }
  const every = int(/hver\s*(\d+)\.?\s*(?:pind|omg|p\b|række)/) || (/hver\s*(?:anden|2\.)\s*(?:pind|omg)/.test(t) ? 2 : null) || (/på hver (?:pind|omg)/.test(t) ? 1 : null);
  if (every) {
    s.type = "hver"; s.dir = dir; s.every = every;
    s.times = int(/i alt\s*(\d+)\s*gange/) || int(/(\d+)\s*gange/) || 1;
    const side = /i hver side|i begge sider|hver side/.test(t);
    const each = int(/(\d+)\s*m\w*\s*(?:ind|ud)?\s*i (?:hver|begge) side/) || int(/(?:tag\w*|tage)\s*(\d+)\s*m/) || 1;
    s.per = side ? 2 * each : (int(/(\d+)\s*m(?:aske)?\w*\s*(?:ind|ud)/) || 1);
    s.text = side ? `${each} m i hver side` : "";
    return s;
  }
  const cm = t.match(/måler\s*(?:ca\.?\s*)?(\d+(?:[.,]\d+)?)\s*cm/);
  if (cm) { s.type = "maal"; s.cm = num(cm[1]); s.text = ""; return s; }
  if (/gentag/.test(t) && /(\d+)\s*gange/.test(t)) {
    s.type = "gentag"; s.times = int(/i alt\s*(\d+)\s*gange/) || int(/(\d+)\s*gange/) || 1;
    const lines = text.split(/\n/).map(x => x.trim()).filter(x => /^(pind|omg|p\.?\s*\d|\d+\.?\s*(pind|omg))/i.test(x));
    s.lines = lines.length ? lines : [];
    s.text = lines.length ? "" : text.trim();
    return s;
  }
  const rows = int(/(\d+)\s*(?:pinde|omgange|omg\.?|p\.)\b/);
  if (rows && !/slå/.test(t)) { s.type = "pinde"; s.n = rows; return s; }
  const co = int(/slå\s*(\d+)\s*m/) || int(/(?:der er|nu)\s*(\d+)\s*m(?:asker)?\s*på/) ;
  if (co) s.set = co;
  return s;
}

/* ---------- Hent tekst fra PDF ---------- */
async function pdfLines(pat) {
  const doc = await openPdf(pat.blob), out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i), tc = await pg.getTextContent();
    const rows = new Map();
    tc.items.forEach(it => { if (!it.str.trim()) return; const y = Math.round(it.transform[5] / 3) * 3; if (!rows.has(y)) rows.set(y, []); rows.get(y).push(it); });
    [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
      const line = items.sort((a, b) => a.transform[4] - b.transform[4]).map(x => x.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) out.push({ page: i, line });
    });
  }
  doc.destroy();
  return out;
}
ACT.planImport = async () => {
  const p = P(), pat = S.patterns.find(x => x.id === p.patternId);
  if (!pat) return;
  if (pat.type !== "pdf") { sheet(`<h3>Kan ikke læse teksten</h3><p class="muted">Opskriften er gemt som billeder, så appen kan ikke læse teksten. Skriv trinnene ind i stedet – du kan have opskriften åben ved siden af.</p><button class="btn" data-close>OK</button>`); return; }
  toast("Læser opskriften…");
  let lines;
  try { lines = await pdfLines(pat); } catch (e) { toast("Teksten kunne ikke læses"); return; }
  const size = ensurePlan(p).size | 0;
  lines.forEach(l => l.line = pickSize(l.line, size));
  if (!lines.length) { sheet(`<h3>Ingen tekst fundet</h3><p class="muted">PDF'en er nok en scannet side uden tekst. Skriv trinnene ind i stedet.</p><button class="btn" data-close>OK</button>`); return; }
  const sel = new Set();
  sheet(`<h3>Hent tekst fra opskriften</h3>
    <div class="small muted">Tallene er valgt for størrelse ${size + 1}. Tryk på de linjer, der hører til ét trin – fx "Tag 1 m ind i hver side på hver 4. pind i alt 6 gange". Tryk derefter "Lav trin". Appen gætter typen og tallene, og du kan rette dem bagefter.</div>
    <div class="lines" id="im-lines">${lines.map((l, k) => `${k === 0 || lines[k - 1].page !== l.page ? `<div class="sechead">Side ${l.page}</div>` : ""}<button class="line" data-k="${k}">${esc(l.line)}</button>`).join("")}</div>
    <div class="grid2"><button class="btn" data-close>Luk</button><button class="btn go" id="im-ok" disabled>Lav trin</button></div>`,
    (el, close) => {
      const ok = $("#im-ok", el);
      $$("#im-lines .line", el).forEach(b => b.onclick = () => {
        const k = +b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k);
        b.classList.toggle("on", sel.has(k));
        ok.disabled = !sel.size; ok.textContent = sel.size ? `Lav trin (${sel.size} linje${sel.size > 1 ? "r" : ""})` : "Lav trin";
      });
      ok.onclick = () => {
        const text = [...sel].sort((a, b) => a - b).map(k => lines[k].line).join("\n");
        close();
        openStepSheet(p, null, guessStep(text));
      };
    });
};
