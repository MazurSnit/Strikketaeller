"use strict";
/* Strikkemonster – projekter, tællere, mønstre, lager, værktøjer og statistik.
   Alt gemmes lokalt i telefonens IndexedDB. */

/* ---------- Små hjælpere ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const fmtDate = s => s ? new Date(s + "T12:00").toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "";
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : d; };
const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString("da-DK");
function fmtTime(ms, secs = false) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (secs) return h + ":" + String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  return h ? `${h} t ${m} min` : `${m} min`;
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 1900); }
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

const STATUS = { aktiv: "I gang", pause: "Pause", plan: "Planlagt", faerdig: "Færdig" };
const WEIGHTS = ["Lace", "Fingering", "Sport", "DK", "Worsted / Aran", "Bulky", "Super bulky"];
const NEEDLE_TYPES = ["Rundpind", "Strømpepinde", "Lige pinde", "Udskiftelig spids", "Hæklenål"];
const INK = [{ c: "#f5d020", n: "Gul" }, { c: "#f08bb8", n: "Pink" }, { c: "#7fd18b", n: "Grøn" }];

const ICON = {
  yarn: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="18" cy="20" r="14" fill="var(--plum)"/><path d="M7 14c6 2 16 2 23 0M5 21c8 3 18 3 26 0M8 28c6 2 14 2 20 0M13 8c-3 7-3 17 1 25M22 7c4 8 4 18-1 26" fill="none" stroke="var(--card)" stroke-width="1.6" stroke-linecap="round" opacity=".55"/><path d="M30 28c4 2 6 5 5 9" fill="none" stroke="var(--plum)" stroke-width="2" stroke-linecap="round"/></svg>',
  skein: '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="20" rx="15" ry="9" fill="var(--honey)"/><path d="M8 17c8 4 16 4 24 0M8 23c8 4 16 4 24 0M14 12c-2 5-2 11 0 16M26 12c2 5 2 11 0 16" fill="none" stroke="var(--card)" stroke-width="1.5" opacity=".6"/></svg>',
  needle: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 34L30 8M14 34L34 12" stroke="var(--moss)" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="7" r="3" fill="var(--moss)"/><circle cx="35" cy="11" r="3" fill="var(--moss)"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  marker: '<svg viewBox="0 0 24 24"><path d="M3 12h18M3 8h18M3 16h18" opacity=".5"/><path d="M3 12h18"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M8 20h12M5 15l9-9 5 5-9 9H8z"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2 7-6 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 012.6-1.5L8 13"/></svg>',
  zin: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 11h5M11 8.5v5"/></svg>',
  zout: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5M8.5 11h5"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  doc: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 4h14l7 7v25H10z" fill="var(--card2)" stroke="var(--muted)" stroke-width="2"/><path d="M15 17h11M15 22h11M15 27h7" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/></svg>'
};
const vStitch = on => `<svg class="stitch${on ? " on" : ""}" viewBox="0 0 18 20"><path d="M3 4 L9 16 L15 4"/></svg>`;

/* ---------- Database ---------- */
const STORES = ["projects", "patterns", "yarns", "needles", "blobs", "meta"];
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("strikketaeller", 1);
      r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: "id" }); });
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode), s = t.objectStore(store), out = fn(s);
      t.oncomplete = () => res(out ? out.result : undefined);
      t.onerror = () => rej(t.error);
    });
  },
  all(store) { return this.tx(store, "readonly", s => s.getAll()); },
  get(store, id) { return this.tx(store, "readonly", s => s.get(id)); },
  put(store, obj) { return this.tx(store, "readwrite", s => s.put(obj)).catch(e => { console.error(e); toast("Kunne ikke gemme – er telefonen fuld?"); }); },
  del(store, id) { return this.tx(store, "readwrite", s => s.delete(id)); },
  clear(store) { return this.tx(store, "readwrite", s => s.clear()); }
};
const S = { projects: [], patterns: [], yarns: [], needles: [], meta: { id: "meta", rowsByDay: {}, pxPerCm: null } };
const save = (store, obj) => DB.put(store, obj);
const saveMeta = () => DB.put("meta", S.meta);

async function putBlob(blob) { const id = uid(); await DB.put("blobs", { id, blob }); return id; }
const urlCache = {};
async function blobURL(id) {
  if (!id) return null;
  if (urlCache[id]) return urlCache[id];
  const r = await DB.get("blobs", id);
  if (!r) return null;
  return (urlCache[id] = URL.createObjectURL(r.blob));
}
async function delBlob(id) { if (!id) return; if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; } await DB.del("blobs", id); }
function hydrateImages(root = document) {
  $$("img[data-blob]", root).forEach(async img => { const u = await blobURL(img.dataset.blob); if (u) img.src = u; else img.remove(); });
}

/* ---------- Billeder ---------- */
function pickFile(accept, multiple = false) {
  return new Promise(res => {
    const inp = $("#filePick");
    inp.value = ""; inp.accept = accept; inp.multiple = multiple;
    inp.onchange = () => res([...inp.files]);
    inp.click();
  });
}
function loadImage(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = rej; im.src = u; });
}
async function shrink(file, max = 1600, q = 0.85) {
  const im = await loadImage(file);
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, "image/jpeg", q));
}
async function pickPhoto(max = 1600) {
  const [f] = await pickFile("image/*");
  if (!f) return null;
  try { return await putBlob(await shrink(f, max)); } catch (e) { toast("Billedet kunne ikke åbnes"); return null; }
}

/* ---------- Ark (dialoger) ---------- */
function sheet(html, mount) {
  const bg = document.createElement("div");
  bg.className = "sheetbg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
  mount && mount(bg.firstElementChild, close);
  const f = bg.querySelector("[data-autofocus]");
  if (f) f.focus();
  return close;
}
function confirmSheet(title, yesText, onYes) {
  sheet(`<h3>${esc(title)}</h3><div class="grid2"><button class="btn" data-close>Nej</button><button class="btn yes" id="yes">${esc(yesText)}</button></div>`,
    (el, close) => $("#yes", el).onclick = () => { close(); onYes(); });
}

/* ---------- Tællere ---------- */
function newCounter(name, opt = {}) { return { id: uid(), name, value: 0, follow: false, every: 0, laps: 0, ...opt }; }
function incC(c) {
  c.value++;
  if (c.every > 0) {
    if (c.value > c.every) c.value = 1;
    if (c.value === c.every) { c.laps = (c.laps || 0) + 1; return "lap"; }
  }
}
function decC(c) {
  if (c.every > 0 && (c.laps || 0) > 0) {
    if (c.value === c.every) { c.laps--; c.value--; return; }
    if (c.value <= 1) { c.value = c.every; return; }
  }
  if (c.value > 0) c.value--;
}
function logRows(n) {
  const d = today();
  S.meta.rowsByDay[d] = (S.meta.rowsByDay[d] || 0) + n;
  if (S.meta.rowsByDay[d] < 0) S.meta.rowsByDay[d] = 0;
  saveMeta();
}
function mainPlus(p) {
  const m = p.counters[0];
  incC(m);
  let lap = null;
  p.counters.slice(1).forEach(c => { if (c.follow && incC(c) === "lap") lap = c; });
  if (p.status === "plan" || p.status === "pause") { p.status = "aktiv"; p.started = p.started || today(); }
  logRows(1);
  save("projects", p);
  if (lap) { buzz([40, 60, 40]); toast(`${lap.name} færdig – starter forfra`); } else buzz(15);
}
function mainMinus(p) {
  const m = p.counters[0];
  if (m.value <= 0) return;
  decC(m);
  p.counters.slice(1).forEach(c => { if (c.follow) decC(c); });
  logRows(-1);
  save("projects", p);
}

/* ---------- Data-opstart og flytning af gamle tal ---------- */
function blankProject(name) {
  return {
    id: uid(), name, status: "aktiv", created: Date.now(), started: today(), finished: "", photo: null, patternId: null,
    needles: "", notes: "", yarns: [], timeMs: 0, timerStart: null,
    counters: [newCounter("Pind"), newCounter("Mønstergentagelse", { follow: true, every: 8 }), newCounter("Masker")]
  };
}
async function migrateOld() {
  if (S.meta.migrated) return;
  S.meta.migrated = true;
  try {
    const old = JSON.parse(localStorage.getItem("strikketaeller-v1"));
    if (old && old.projects && old.projects.length && !S.projects.length) {
      for (const o of old.projects) {
        const p = blankProject(o.name || "Mit strikketøj");
        const rows = o.rows || 0, L = Math.max(1, o.rep | 0 || 8);
        p.counters[0].value = rows;
        p.counters[1].every = L;
        p.counters[1].value = rows === 0 ? 0 : ((rows - 1) % L) + 1;
        p.counters[1].laps = Math.floor(rows / L);
        p.counters[2].value = o.stitches || 0;
        p.notes = o.notes || "";
        S.projects.push(p); await save("projects", p);
      }
    }
  } catch (e) {}
  await saveMeta();
}

/* ---------- Navigation ---------- */
let route = { tab: "projekter" };
let ticker = null;
function parseHash() {
  const [path, q] = (location.hash.replace(/^#\/?/, "") || "projekter").split("?");
  const parts = path.split("/");
  const params = new URLSearchParams(q || "");
  return { tab: parts[0], id: parts[1], params };
}
function go(h) { location.hash = h; }
window.addEventListener("hashchange", render);

function render() {
  route = parseHash();
  clearInterval(ticker);
  closeViewer();
  const tabFor = { projekt: "projekter", moenster: "moenstre" }[route.tab] || route.tab;
  $$(".nav a").forEach(a => a.classList.toggle("on", a.dataset.tab === tabFor));
  const v = $("#view");
  const views = { projekter: viewProjects, projekt: viewProject, moenstre: viewPatterns, moenster: viewPatterns, lager: viewStash, vaerktoejer: viewTools, statistik: viewStats };
  (views[route.tab] || viewProjects)(v);
  hydrateImages(v);
  if (route.tab === "moenster" && route.id) openViewer(route.id, route.params.get("p"));
}
function setTitle(t) { $("#title").textContent = t; document.title = t === "Strikkemonster" ? t : t + " · Strikkemonster"; }

/* ---------- Fælles klik-håndtering ---------- */
const ACT = {};
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]");
  if (!a) return;
  const f = ACT[a.dataset.act];
  if (f) { e.preventDefault(); f(a, e); }
});

/* ================= PROJEKTER ================= */
let projFilter = "alle";
function viewProjects(v) {
  setTitle("Strikkemonster");
  const order = { aktiv: 0, pause: 1, plan: 2, faerdig: 3 };
  const list = S.projects
    .filter(p => projFilter === "alle" || p.status === projFilter)
    .sort((a, b) => order[a.status] - order[b.status] || (b.updated || b.created) - (a.updated || a.created));
  const chip = (k, t) => `<button class="chip${projFilter === k ? " on" : ""}" data-act="pfilter" data-k="${k}">${t}</button>`;
  v.innerHTML = `
    ${S.projects.length ? `<div class="hello"><img src="monster.jpg" alt=""><div><b>Hej! Monster har strikketøjet klar</b><span>${S.projects.filter(p => p.status === "aktiv").length} projekt${S.projects.filter(p => p.status === "aktiv").length === 1 ? "" : "er"} i gang</span></div></div>` : ""}
    <div class="sec-title"><h2>Mine projekter</h2><button class="chip on" data-act="newProject">+ Nyt</button></div>
    <div class="chips">${chip("alle", "Alle")}${chip("aktiv", "I gang")}${chip("pause", "Pause")}${chip("plan", "Planlagt")}${chip("faerdig", "Færdige")}</div>
    ${list.length ? `<div class="plist">${list.map(p => `
      <a class="pcard" href="#/projekt/${p.id}">
        <div class="ph">${p.photo ? `<img data-blob="${p.photo}" alt="">` : ICON.yarn}</div>
        <div class="tx"><b>${esc(p.name)}</b>
          <span class="st ${p.status}">${STATUS[p.status]}${p.status !== "plan" ? ` · pind ${p.counters[0].value}` : ""}</span>
        </div>
      </a>`).join("")}</div>`
      : `<div class="card empty-state"><img class="monster" src="monster.jpg" alt="Monster med strikketøj i munden"><b>${S.projects.length ? "Ingen projekter her" : "Monster er klar til første projekt"}</b><span>Opret et projekt for at tælle pinde, gemme opskriften og holde styr på garnet.</span><button class="btn go" data-act="newProject">+ Nyt projekt</button></div>`}`;
}
ACT.pfilter = a => { projFilter = a.dataset.k; render(); };
ACT.newProject = () => {
  sheet(`<h3>Nyt projekt</h3>
    <label class="f">Navn<input type="text" id="np-name" data-autofocus placeholder="F.eks. Sweater til Ida"></label>
    <label class="f">Status<select id="np-status"><option value="aktiv">I gang</option><option value="plan">Planlagt</option></select></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="np-ok">Opret</button></div>`,
    (el, close) => {
      const ok = async () => {
        const p = blankProject($("#np-name", el).value.trim() || "Nyt projekt");
        p.status = $("#np-status", el).value;
        if (p.status === "plan") p.started = "";
        S.projects.push(p); await save("projects", p); close(); go("#/projekt/" + p.id);
      };
      $("#np-ok", el).onclick = ok;
      $("#np-name", el).onkeydown = e => { if (e.key === "Enter") ok(); };
    });
};

const P = () => S.projects.find(p => p.id === route.id);
function touch(p) { p.updated = Date.now(); save("projects", p); }

function counterHTML(c, i) {
  const main = i === 0;
  let body;
  if (c.every > 0) {
    const pos = c.value;
    body = `<div class="count">
        <button class="minus" data-act="cMinus" data-i="${i}" aria-label="${esc(c.name)} én mindre">−</button>
        <span class="n">${pos}<small class="muted" style="font-size:.4em"> / ${c.every}</small></span>
        <button class="plus" data-act="cPlus" data-i="${i}" aria-label="${esc(c.name)} én mere">+</button>
      </div>
      <div class="prog">
        ${c.every <= 48 ? `<div class="stitches">${Array.from({ length: c.every }, (_, k) => vStitch(k < pos)).join("")}</div>` : ""}
        <div class="txt">Gentagelser færdige: <strong>${c.laps || 0}</strong>${c.follow ? " · følger pind" : ""}</div>
      </div>`;
  } else {
    body = `<div class="count">
        <button class="minus" data-act="cMinus" data-i="${i}" aria-label="${esc(c.name)} én mindre">−</button>
        <span class="n">${c.value}</span>
        <button class="plus" data-act="cPlus" data-i="${i}" aria-label="${esc(c.name)} én mere">+</button>
      </div>${c.follow && !main ? `<div class="txt muted small">Følger pind</div>` : ""}`;
  }
  return `<section class="card counter${main ? " main" : c.every > 0 ? " rep" : ""}">
    <div class="head"><h2>${esc(c.name)}</h2>
      <button class="iconbtn" data-act="cMenu" data-i="${i}" aria-label="Indstillinger for ${esc(c.name)}">${ICON.dots}</button></div>
    ${body}</section>`;
}

function viewProject(v) {
  const p = P();
  if (!p) { go("#/projekter"); return; }
  setTitle(p.name);
  const pat = S.patterns.find(x => x.id === p.patternId);
  const running = !!p.timerStart;
  const elapsed = () => p.timeMs + (p.timerStart ? Date.now() - p.timerStart : 0);
  const yarnRows = p.yarns.map((u, k) => {
    const y = S.yarns.find(y => y.id === u.yarnId);
    if (!y) return "";
    return `<div class="item"><div class="sw">${y.photo ? `<img data-blob="${y.photo}" alt="">` : ICON.skein}</div>
      <div class="tx"><b>${esc(y.brand)} ${esc(y.name)}</b><span>${fmtNum(u.skeins)} nøgler${y.meters ? ` · ${fmtNum(u.skeins * y.meters)} m` : ""}${y.color ? ` · ${esc(y.color)}` : ""}</span></div>
      <button class="iconbtn" data-act="pyDel" data-k="${k}" aria-label="Fjern garn">✕</button></div>`;
  }).join("");
  v.innerHTML = `
    <div class="row"><a class="chip ghost" href="#/projekter">‹ Projekter</a></div>
    <div class="hero">${p.photo ? `<img data-blob="${p.photo}" alt="">` : `<div class="empty">${ICON.yarn}</div>`}
      <button class="round photo" data-act="pPhoto" aria-label="Skift billede">${ICON.camera}</button></div>
    <div class="namebox"><h2>${esc(p.name)}</h2><button class="iconbtn" data-act="pRename" aria-label="Omdøb">${ICON.pen}</button></div>
    <div class="chips">${Object.entries(STATUS).map(([k, t]) => `<button class="chip${p.status === k ? " on" : ""}" data-act="pStatus" data-k="${k}">${t}</button>`).join("")}</div>

    <div class="timer${running ? " run" : ""}">
      <div><div class="small muted">Strikketid</div><div class="t" id="ptime">${fmtTime(elapsed(), true)}</div></div>
      <button class="btn${running ? "" : " go"}" data-act="pTimer">${running ? "Stop" : "Start"}</button>
    </div>

    ${p.counters.map(counterHTML).join("")}
    <button class="btn wide" data-act="cAdd">+ Tilføj tæller</button>

    <section class="card" style="--accent:var(--primary)">
      <div class="head"><h2>Opskrift</h2>${pat ? `<button class="chip ghost" data-act="pPattern">Skift</button>` : ""}</div>
      ${pat ? `<a class="item" href="#/moenster/${pat.id}?p=${p.id}"><div class="sw">${pat.thumb ? `<img data-blob="${pat.thumb}" alt="">` : ICON.doc}</div>
        <div class="tx"><b>${esc(pat.name)}</b><span>Tryk for at åbne med tusch og tæller</span></div><span aria-hidden="true">›</span></a>`
      : `<button class="btn wide" data-act="pPattern">Vælg eller upload opskrift</button>`}
    </section>

    <section class="card" style="--accent:var(--honey)">
      <div class="head"><h2>Garn</h2><button class="chip ghost" data-act="pyAdd">+ Garn</button></div>
      ${yarnRows ? `<div class="list">${yarnRows}</div>` : `<div class="muted small">Intet garn tilknyttet endnu. Garnet trækkes fra dit lager.</div>`}
    </section>

    <section class="card" style="--accent:var(--moss)">
      <div class="head"><h2>Detaljer</h2></div>
      <label class="f">Pinde<input type="text" data-pf="needles" value="${esc(p.needles)}" placeholder="F.eks. 4,5 mm rundpind 80 cm"></label>
      <div class="grid2">
        <label class="f">Startet<input type="date" data-pf="started" value="${esc(p.started)}"></label>
        <label class="f">Færdig<input type="date" data-pf="finished" value="${esc(p.finished)}"></label>
      </div>
    </section>

    <section class="card" style="--accent:var(--muted)">
      <div class="head"><h2>Noter</h2></div>
      <textarea data-pf="notes" aria-label="Noter" placeholder="F.eks. tag ind i hver 6. pind">${esc(p.notes)}</textarea>
    </section>

    <button class="chip ghost danger-link" data-act="pDelete">Slet projekt</button>`;

  $$("[data-pf]", v).forEach(inp => inp.addEventListener(inp.tagName === "TEXTAREA" || inp.type === "text" ? "input" : "change", () => { p[inp.dataset.pf] = inp.value; touch(p); }));
  if (running) ticker = setInterval(() => { const t = $("#ptime"); if (t) t.textContent = fmtTime(elapsed(), true); }, 1000);
}
function rerenderKeepScroll() { const y = scrollY; render(); scrollTo(0, y); }

ACT.cPlus = a => { const p = P(), i = +a.dataset.i; if (i === 0) mainPlus(p); else { if (incC(p.counters[i]) === "lap") { buzz([40, 60, 40]); toast(`${p.counters[i].name} færdig`); } else buzz(10); } touch(p); rerenderKeepScroll(); };
ACT.cMinus = a => { const p = P(), i = +a.dataset.i; if (i === 0) mainMinus(p); else decC(p.counters[i]); touch(p); rerenderKeepScroll(); };
ACT.cAdd = () => counterSheet(P(), null);
ACT.cMenu = a => counterSheet(P(), +a.dataset.i);
function counterSheet(p, i) {
  const isNew = i === null, c = isNew ? newCounter("") : p.counters[i], main = i === 0;
  sheet(`<h3>${isNew ? "Ny tæller" : esc(c.name)}</h3>
    <label class="f">Navn<input type="text" id="cs-name" value="${esc(c.name)}" placeholder="F.eks. Udtagninger"></label>
    ${main ? "" : `<label class="check"><input type="checkbox" id="cs-follow"${c.follow ? " checked" : ""}> Tæl op sammen med Pind</label>`}
    <label class="f">Start forfra efter (antal) – tom = tæl frit<input type="number" id="cs-every" min="0" max="500" inputmode="numeric" value="${c.every || ""}" placeholder="F.eks. 8"></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="cs-ok">Gem</button></div>
    ${isNew ? "" : `<div class="grid2"><button class="btn" id="cs-reset">Nulstil</button>${main ? "<span></span>" : `<button class="btn" id="cs-del">Slet tæller</button>`}</div>`}`,
    (el, close) => {
      $("#cs-ok", el).onclick = () => {
        c.name = $("#cs-name", el).value.trim() || (main ? "Pind" : "Tæller");
        if (!main) c.follow = $("#cs-follow", el).checked;
        const ev = Math.max(0, Math.min(500, parseInt($("#cs-every", el).value) || 0));
        if (ev !== c.every) { c.every = ev; if (ev && c.value > ev) c.value = ((c.value - 1) % ev) + 1; }
        if (isNew) p.counters.push(c);
        touch(p); close(); rerenderKeepScroll();
      };
      const r = $("#cs-reset", el);
      if (r) r.onclick = () => { close(); confirmSheet(`Nulstil ${c.name}?`, "Ja, nulstil", () => { c.value = 0; c.laps = 0; touch(p); rerenderKeepScroll(); toast("Nulstillet"); }); };
      const d = $("#cs-del", el);
      if (d) d.onclick = () => { close(); confirmSheet(`Slet tælleren ${c.name}?`, "Ja, slet", () => { p.counters.splice(i, 1); touch(p); rerenderKeepScroll(); }); };
    });
}
ACT.pStatus = a => {
  const p = P(); p.status = a.dataset.k;
  if (p.status === "aktiv" && !p.started) p.started = today();
  if (p.status === "faerdig") { if (!p.finished) p.finished = today(); stopTimer(p); toast("Tillykke – projektet er færdigt!"); buzz([30, 50, 30, 50, 60]); }
  touch(p); rerenderKeepScroll();
};
function stopTimer(p) { if (p.timerStart) { p.timeMs += Date.now() - p.timerStart; p.timerStart = null; } }
ACT.pTimer = () => {
  const p = P();
  if (p.timerStart) stopTimer(p);
  else { S.projects.forEach(o => { if (o.timerStart && o !== p) { stopTimer(o); save("projects", o); } }); p.timerStart = Date.now(); if (p.status !== "aktiv") { p.status = "aktiv"; p.started = p.started || today(); } }
  touch(p); rerenderKeepScroll();
};
ACT.pPhoto = async () => { const p = P(); const id = await pickPhoto(); if (!id) return; await delBlob(p.photo); p.photo = id; touch(p); rerenderKeepScroll(); };
ACT.pRename = () => {
  const p = P();
  sheet(`<h3>Omdøb projekt</h3><label class="f">Navn<input type="text" id="rn" value="${esc(p.name)}"></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="rn-ok">Gem</button></div>`,
    (el, close) => $("#rn-ok", el).onclick = () => { p.name = $("#rn", el).value.trim() || p.name; touch(p); close(); rerenderKeepScroll(); });
};
ACT.pDelete = () => {
  const p = P();
  confirmSheet(`Slet "${p.name}" helt?`, "Ja, slet", async () => {
    await delBlob(p.photo); S.projects = S.projects.filter(x => x !== p); await DB.del("projects", p.id); toast("Projekt slettet"); go("#/projekter");
  });
};
ACT.pPattern = () => {
  const p = P();
  sheet(`<h3>Opskrift til projektet</h3>
    <button class="btn go wide" id="pp-up">Upload PDF eller billeder</button>
    ${S.patterns.length ? `<div class="list">${S.patterns.map(x => `<button class="item" data-pid="${x.id}"><div class="sw">${x.thumb ? `<img data-blob="${x.thumb}" alt="">` : ICON.doc}</div><div class="tx"><b>${esc(x.name)}</b><span>${esc(x.category || "Uden kategori")}</span></div></button>`).join("")}</div>` : `<div class="muted small">Du har ingen opskrifter endnu.</div>`}
    ${p.patternId ? `<button class="btn" id="pp-none">Fjern opskrift fra projektet</button>` : ""}
    <button class="btn" data-close>Luk</button>`,
    (el, close) => {
      hydrateImages(el);
      $$("[data-pid]", el).forEach(b => b.onclick = () => { p.patternId = b.dataset.pid; touch(p); close(); rerenderKeepScroll(); });
      $("#pp-up", el).onclick = async () => { close(); const pat = await uploadPattern(); if (pat) { p.patternId = pat.id; touch(p); rerenderKeepScroll(); } };
      const n = $("#pp-none", el); if (n) n.onclick = () => { p.patternId = null; touch(p); close(); rerenderKeepScroll(); };
    });
};
ACT.pyAdd = () => {
  const p = P();
  if (!S.yarns.length) { sheet(`<h3>Intet garn på lager</h3><p class="muted">Tilføj dit garn under Lager først – så kan du vælge det her, og det trækkes automatisk fra lageret.</p><div class="grid2"><button class="btn" data-close>Luk</button><a class="btn go" href="#/lager" data-close>Gå til Lager</a></div>`); return; }
  sheet(`<h3>Tilføj garn</h3>
    <label class="f">Garn<select id="py-y">${S.yarns.map(y => `<option value="${y.id}">${esc(y.brand)} ${esc(y.name)}${y.color ? " – " + esc(y.color) : ""} (${fmtNum(yarnLeft(y))} tilbage)</option>`).join("")}</select></label>
    <label class="f">Antal nøgler<input type="number" id="py-n" min="0.5" step="0.5" inputmode="decimal" value="1"></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="py-ok">Tilføj</button></div>`,
    (el, close) => $("#py-ok", el).onclick = () => {
      const yarnId = $("#py-y", el).value, n = num($("#py-n", el).value, 1);
      const ex = p.yarns.find(u => u.yarnId === yarnId);
      if (ex) ex.skeins += n; else p.yarns.push({ yarnId, skeins: n });
      touch(p); close(); rerenderKeepScroll();
    });
};
ACT.pyDel = a => { const p = P(); p.yarns.splice(+a.dataset.k, 1); touch(p); rerenderKeepScroll(); };

/* ================= MØNSTRE ================= */
let patCat = "alle";
function viewPatterns(v) {
  setTitle("Mønstre");
  const cats = [...new Set(S.patterns.map(p => p.category).filter(Boolean))].sort();
  const list = S.patterns.filter(p => patCat === "alle" || p.category === patCat).sort((a, b) => b.created - a.created);
  v.innerHTML = `
    <div class="sec-title"><h2>Mine opskrifter</h2><button class="chip on" data-act="patUp">+ Upload</button></div>
    ${cats.length ? `<div class="chips"><button class="chip${patCat === "alle" ? " on" : ""}" data-act="patCat" data-k="alle">Alle</button>${cats.map(c => `<button class="chip${patCat === c ? " on" : ""}" data-act="patCat" data-k="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
    ${list.length ? `<div class="patgrid">${list.map(p => `
      <a class="pat" href="#/moenster/${p.id}">
        <div class="th">${p.thumb ? `<img data-blob="${p.thumb}" alt="">` : ICON.doc}</div>
        <div class="tx"><b>${esc(p.name)}</b><span class="small muted">${p.type === "pdf" ? "PDF" : "Billeder"} · ${p.pageCount || p.pages?.length || 1} sider</span></div>
      </a>`).join("")}</div>`
      : `<div class="card empty-state">${ICON.doc}<b>Ingen opskrifter endnu</b><span>Upload en PDF eller tag billeder af en opskrift. Så kan du streje med tusch og bruge en markør, mens du strikker.</span><button class="btn go" data-act="patUp">Upload opskrift</button></div>`}`;
}
ACT.patCat = a => { patCat = a.dataset.k; render(); };
ACT.patUp = async () => { const pat = await uploadPattern(); if (pat) go("#/moenster/" + pat.id); };

let pdfReady = null;
function loadPdfJs() {
  if (pdfReady) return pdfReady;
  pdfReady = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "vendor/pdf.min.js";
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; res(window.pdfjsLib); };
    s.onerror = () => { pdfReady = null; rej(new Error("pdf.js")); };
    document.head.appendChild(s);
  });
  return pdfReady;
}
async function openPdf(blobId) {
  const lib = await loadPdfJs();
  const r = await DB.get("blobs", blobId);
  const data = new Uint8Array(await r.blob.arrayBuffer());
  return lib.getDocument({ data }).promise;
}
function canvasToBlob(c, q = 0.8) { return new Promise(r => c.toBlob(r, "image/jpeg", q)); }

async function uploadPattern() {
  const files = await pickFile("application/pdf,image/*", true);
  if (!files.length) return null;
  toast("Gemmer opskriften…");
  const isPdf = files[0].type === "application/pdf" || /\.pdf$/i.test(files[0].name);
  const name = files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Opskrift";
  const pat = { id: uid(), name, category: "", created: Date.now(), marks: {}, markerY: 0.05, markerOn: true };
  try {
    if (isPdf) {
      pat.type = "pdf";
      pat.blob = await putBlob(files[0]);
      const doc = await openPdf(pat.blob);
      pat.pageCount = doc.numPages;
      const pg = await doc.getPage(1), vp = pg.getViewport({ scale: 1 });
      const c = document.createElement("canvas"), k = 400 / vp.width;
      c.width = 400; c.height = Math.round(vp.height * k);
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: ctx, viewport: pg.getViewport({ scale: k }) }).promise;
      pat.thumb = await putBlob(await canvasToBlob(c));
      doc.destroy();
    } else {
      pat.type = "img";
      pat.pages = [];
      for (const f of files) pat.pages.push(await putBlob(await shrink(f, 2200, 0.88)));
      pat.pageCount = pat.pages.length;
      pat.thumb = await putBlob(await shrink(files[0], 400, 0.8));
    }
  } catch (e) { console.error(e); toast("Filen kunne ikke åbnes"); return null; }
  S.patterns.push(pat); await save("patterns", pat);
  toast("Opskrift gemt");
  return pat;
}

/* ---------- Viseren ---------- */
const VZ = [1, 1.4, 1.8, 2.4];
let V = null; // aktiv viser
function closeViewer() { if (V) { V.el.remove(); V.doc && V.doc.destroy && V.doc.destroy(); V = null; document.body.style.overflow = ""; } }

async function openViewer(patId, projId) {
  const pat = S.patterns.find(p => p.id === patId);
  if (!pat) { go("#/moenstre"); return; }
  const proj = S.projects.find(p => p.id === projId) || S.projects.find(p => p.patternId === pat.id && p.status === "aktiv") || S.projects.find(p => p.patternId === pat.id);
  const el = document.createElement("div");
  el.className = "viewer";
  el.innerHTML = `
    <div class="vtop">
      <button class="iconbtn" id="v-back" aria-label="Tilbage">${ICON.back}</button>
      <b>${esc(pat.name)}</b>
      <button class="iconbtn" id="v-zout" aria-label="Zoom ud">${ICON.zout}</button>
      <button class="iconbtn" id="v-zin" aria-label="Zoom ind">${ICON.zin}</button>
      <button class="iconbtn" id="v-menu" aria-label="Indstillinger">${ICON.dots}</button>
    </div>
    <div class="vtools">
      <button class="tool" data-mode="scroll" aria-label="Rul">${ICON.hand}</button>
      <button class="tool" data-mode="pen" aria-label="Tusch">${ICON.pen}</button>
      ${INK.map((k, i) => `<button class="dotc" data-ink="${i}" style="background:${k.c}" aria-label="${k.n} tusch"></button>`).join("")}
      <button class="tool" data-mode="erase" aria-label="Viskelæder">${ICON.eraser}</button>
      <span class="sep"></span>
      <button class="tool" id="v-marker">${ICON.marker} Markør</button>
      <button class="tool" id="v-mup" aria-label="Markør op">${ICON.up}</button>
      <button class="tool" id="v-mdown" aria-label="Markør ned">${ICON.down}</button>
    </div>
    <div class="vscroll" id="v-scroll"><div class="vpages" id="v-pages"><div class="marker" id="v-mk"><span class="grip" aria-hidden="true">⇕</span></div></div></div>
    <div class="vbottom" id="v-bottom"></div>`;
  document.body.appendChild(el);
  document.body.style.overflow = "hidden";
  V = { el, pat, proj, zoom: 0, mode: "scroll", ink: 0, pages: [], doc: null };

  $("#v-back", el).onclick = () => history.length > 1 ? history.back() : go("#/moenstre");
  $("#v-zin", el).onclick = () => setZoom(1);
  $("#v-zout", el).onclick = () => setZoom(-1);
  $("#v-menu", el).onclick = () => patternMenu(pat);
  $$("[data-mode]", el).forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $$("[data-ink]", el).forEach(b => b.onclick = () => { V.ink = +b.dataset.ink; setMode("pen"); });
  $("#v-marker", el).onclick = () => { pat.markerOn = !pat.markerOn; save("patterns", pat); drawMarker(); };
  const nudge = d => { const tot = $("#v-pages", el).scrollHeight; pat.markerY = Math.max(0, Math.min(1, pat.markerY + d / tot)); pat.markerOn = true; save("patterns", pat); drawMarker(true); };
  $("#v-mup", el).onclick = () => nudge(-18);
  $("#v-mdown", el).onclick = () => nudge(18);
  setupMarkerDrag();
  setMode("scroll");
  renderVBottom();

  // Sider
  const box = $("#v-pages", el);
  try {
    if (pat.type === "pdf") {
      V.doc = await openPdf(pat.blob);
      for (let i = 1; i <= V.doc.numPages; i++) {
        const pg = await V.doc.getPage(i);
        const vp = pg.getViewport({ scale: 1 });
        V.pages.push({ i: i - 1, pdfPage: pg, ar: vp.height / vp.width, w: vp.width });
      }
    } else {
      for (let i = 0; i < pat.pages.length; i++) {
        const u = await blobURL(pat.pages[i]);
        const im = await new Promise((res, rej) => { const m = new Image(); m.onload = () => res(m); m.onerror = rej; m.src = u; });
        V.pages.push({ i, img: im, ar: im.naturalHeight / im.naturalWidth });
      }
    }
  } catch (e) { console.error(e); toast("Opskriften kunne ikke vises"); return; }
  if (!V || V.el !== el) return;
  V.pages.forEach(p => {
    const d = document.createElement("div");
    d.className = "vpage"; d.style.aspectRatio = `1 / ${p.ar}`;
    d.innerHTML = `<canvas class="pg"></canvas><canvas class="ink"></canvas>`;
    box.appendChild(d); p.el = d;
    setupInk(p);
  });
  layoutPages();
  window.addEventListener("resize", onVResize);
}
function onVResize() { if (V) { clearTimeout(onVResize.t); onVResize.t = setTimeout(layoutPages, 200); } }
function setZoom(d) {
  if (!V) return;
  const sc = $("#v-scroll", V.el), ratio = sc.scrollTop / Math.max(1, sc.scrollHeight);
  V.zoom = Math.max(0, Math.min(VZ.length - 1, V.zoom + d));
  layoutPages();
  sc.scrollTop = ratio * sc.scrollHeight;
}
function setMode(m) {
  V.mode = m;
  V.el.classList.toggle("draw", m !== "scroll");
  $$("[data-mode]", V.el).forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  $$("[data-ink]", V.el).forEach(b => b.classList.toggle("on", m === "pen" && +b.dataset.ink === V.ink));
}
let renderGen = 0;
async function layoutPages() {
  if (!V) return;
  const sc = $("#v-scroll", V.el), box = $("#v-pages", V.el);
  const baseW = Math.min(sc.clientWidth - 16, 900);
  const w = Math.round(baseW * VZ[V.zoom]);
  box.style.width = w + "px";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const gen = ++renderGen;
  for (const p of V.pages) {
    p.cssW = w; p.cssH = Math.round(w * p.ar);
    const pc = p.el.querySelector(".pg"), ic = p.el.querySelector(".ink");
    const pw = Math.min(Math.round(w * dpr), 2600), ph = Math.round(pw * p.ar);
    ic.width = pw; ic.height = ph; drawInk(p);
    if (p.renderedW === pw) continue;
    if (p.img) { pc.width = pw; pc.height = ph; pc.getContext("2d").drawImage(p.img, 0, 0, pw, ph); p.renderedW = pw; }
  }
  drawMarker();
  for (const p of V.pages) {
    if (!p.pdfPage || p.renderedW === Math.min(Math.round(w * dpr), 2600)) continue;
    if (gen !== renderGen || !V) return;
    const pw = Math.min(Math.round(w * dpr), 2600), ph = Math.round(pw * p.ar);
    const off = document.createElement("canvas"); off.width = pw; off.height = ph;
    const ctx = off.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pw, ph);
    try { await p.pdfPage.render({ canvasContext: ctx, viewport: p.pdfPage.getViewport({ scale: pw / p.w }) }).promise; } catch (e) { continue; }
    if (gen !== renderGen || !V) return;
    const pc = p.el.querySelector(".pg"); pc.width = pw; pc.height = ph; pc.getContext("2d").drawImage(off, 0, 0); p.renderedW = pw;
  }
}
function drawInk(p) {
  const c = p.el.querySelector(".ink"), ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  (V.pat.marks[p.i] || []).forEach(s => strokePath(ctx, s, c.width, c.height));
}
function strokePath(ctx, s, W, H) {
  ctx.save();
  ctx.globalAlpha = 0.38; ctx.strokeStyle = INK[s.c]?.c || INK[0].c;
  ctx.lineWidth = 0.022 * W; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  s.pts.forEach(([x, y], k) => k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H));
  if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] * W + 0.1, s.pts[0][1] * H);
  ctx.stroke(); ctx.restore();
}
function setupInk(p) {
  const c = p.el.querySelector(".ink");
  let cur = null;
  const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const eraseAt = q => {
    const arr = V.pat.marks[p.i] || [], before = arr.length;
    V.pat.marks[p.i] = arr.filter(s => !s.pts.some(([x, y]) => Math.hypot(x - q[0], (y - q[1]) / p.ar) < 0.03));
    if (V.pat.marks[p.i].length !== before) drawInk(p);
  };
  c.addEventListener("pointerdown", e => {
    if (!V || V.mode === "scroll") return;
    c.setPointerCapture(e.pointerId);
    if (V.mode === "erase") { eraseAt(pt(e)); cur = "erase"; return; }
    cur = { c: V.ink, pts: [pt(e)] };
  });
  c.addEventListener("pointermove", e => {
    if (!cur) return;
    if (cur === "erase") { eraseAt(pt(e)); return; }
    const q = pt(e), last = cur.pts[cur.pts.length - 1];
    if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.004) return;
    cur.pts.push(q);
    drawInk(p); strokePath(c.getContext("2d"), cur, c.width, c.height);
  });
  const end = () => {
    if (!cur) return;
    if (cur !== "erase") { (V.pat.marks[p.i] = V.pat.marks[p.i] || []).push({ c: cur.c, pts: cur.pts.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]) }); drawInk(p); }
    cur = null; save("patterns", V.pat);
  };
  c.addEventListener("pointerup", end);
  c.addEventListener("pointercancel", end);
}
function drawMarker(scrollTo) {
  if (!V) return;
  const mk = $("#v-mk", V.el), box = $("#v-pages", V.el);
  mk.hidden = !V.pat.markerOn;
  $("#v-marker", V.el).classList.toggle("on", !!V.pat.markerOn);
  const y = V.pat.markerY * box.scrollHeight;
  mk.style.top = y + "px";
  if (scrollTo) {
    const sc = $("#v-scroll", V.el), r = sc.clientHeight;
    if (y < sc.scrollTop + 60 || y > sc.scrollTop + r - 60) sc.scrollTo({ top: y - r / 3, behavior: "smooth" });
  }
}
function setupMarkerDrag() {
  const grip = $("#v-mk .grip", V.el), box = $("#v-pages", V.el), sc = $("#v-scroll", V.el);
  let drag = false;
  grip.addEventListener("pointerdown", e => { drag = true; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
  grip.addEventListener("pointermove", e => {
    if (!drag) return;
    const r = box.getBoundingClientRect();
    V.pat.markerY = Math.max(0, Math.min(1, (e.clientY - r.top) / box.scrollHeight));
    drawMarker();
    const sr = sc.getBoundingClientRect();
    if (e.clientY > sr.bottom - 40) sc.scrollTop += 12; else if (e.clientY < sr.top + 40) sc.scrollTop -= 12;
  });
  const end = () => { if (drag) { drag = false; save("patterns", V.pat); } };
  grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
}
function renderVBottom() {
  const b = $("#v-bottom", V.el), p = V.proj;
  if (!p) {
    b.innerHTML = `<div class="lbl"><span>Knyt opskriften til et projekt for at tælle pinde her</span></div><button class="btn" id="v-link">Vælg projekt</button>`;
    $("#v-link", b).onclick = () => {
      if (!S.projects.length) { toast("Opret et projekt først"); return; }
      sheet(`<h3>Vælg projekt</h3><div class="list">${S.projects.map(x => `<button class="item" data-pj="${x.id}"><div class="sw">${x.photo ? `<img data-blob="${x.photo}" alt="">` : ICON.yarn}</div><div class="tx"><b>${esc(x.name)}</b><span>${STATUS[x.status]}</span></div></button>`).join("")}</div><button class="btn" data-close>Luk</button>`,
        (el, close) => { hydrateImages(el); $$("[data-pj]", el).forEach(btn => btn.onclick = () => { const pj = S.projects.find(x => x.id === btn.dataset.pj); pj.patternId = V.pat.id; touch(pj); V.proj = pj; close(); renderVBottom(); }); });
    };
    return;
  }
  const m = p.counters[0], rep = p.counters.find((c, i) => i > 0 && c.follow && c.every);
  b.innerHTML = `<button class="minus" id="v-minus" aria-label="Én pind mindre">−</button>
    <div class="lbl"><span>${esc(p.name)} · ${esc(m.name)}</span><b>${m.value}</b>${rep ? `<span>${esc(rep.name)}: ${rep.value} / ${rep.every}</span>` : ""}</div>
    <button class="plus" id="v-plus" aria-label="Én pind mere">+</button>`;
  $("#v-plus", b).onclick = () => { mainPlus(p); touch(p); renderVBottom(); };
  $("#v-minus", b).onclick = () => { mainMinus(p); touch(p); renderVBottom(); };
}
function patternMenu(pat) {
  const cats = [...new Set(S.patterns.map(p => p.category).filter(Boolean))];
  sheet(`<h3>Opskrift</h3>
    <label class="f">Navn<input type="text" id="pm-name" value="${esc(pat.name)}"></label>
    <label class="f">Kategori<input type="text" id="pm-cat" list="pm-cats" value="${esc(pat.category)}" placeholder="F.eks. Sweatre, Huer, Sokker"></label>
    <datalist id="pm-cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="pm-ok">Gem</button></div>
    <div class="grid2"><button class="btn" id="pm-clear">Fjern al tusch</button><button class="btn" id="pm-del">Slet opskrift</button></div>`,
    (el, close) => {
      $("#pm-ok", el).onclick = () => { pat.name = $("#pm-name", el).value.trim() || pat.name; pat.category = $("#pm-cat", el).value.trim(); save("patterns", pat); close(); if (V) $(".vtop b", V.el).textContent = pat.name; };
      $("#pm-clear", el).onclick = () => { close(); confirmSheet("Fjern al tusch i opskriften?", "Ja, fjern", () => { pat.marks = {}; save("patterns", pat); if (V) V.pages.forEach(drawInk); }); };
      $("#pm-del", el).onclick = () => { close(); confirmSheet(`Slet "${pat.name}"?`, "Ja, slet", async () => {
        for (const id of [pat.blob, pat.thumb, ...(pat.pages || [])]) await delBlob(id);
        S.patterns = S.patterns.filter(x => x !== pat); await DB.del("patterns", pat.id);
        S.projects.forEach(p => { if (p.patternId === pat.id) { p.patternId = null; save("projects", p); } });
        toast("Opskrift slettet"); go("#/moenstre");
      }); };
    });
}

/* ================= LAGER ================= */
let stashTab = "garn", stashQ = "", stashW = "alle";
const yarnUsed = y => S.projects.reduce((s, p) => s + p.yarns.filter(u => u.yarnId === y.id).reduce((a, u) => a + u.skeins, 0), 0);
const yarnLeft = y => (y.skeins || 0) - yarnUsed(y);
function viewStash(v) {
  setTitle("Lager");
  const seg = `<div class="chips"><button class="chip${stashTab === "garn" ? " on" : ""}" data-act="stTab" data-k="garn">Garn (${S.yarns.length})</button><button class="chip${stashTab === "pinde" ? " on" : ""}" data-act="stTab" data-k="pinde">Pinde (${S.needles.length})</button></div>`;
  if (stashTab === "pinde") {
    const list = [...S.needles].sort((a, b) => num(a.size) - num(b.size));
    v.innerHTML = `${seg}<div class="sec-title"><h2>Mine pinde</h2><button class="chip on" data-act="ndEdit">+ Pinde</button></div>
      ${list.length ? `<div class="list">${list.map(n => `<button class="item" data-act="ndEdit" data-id="${n.id}"><div class="sw" style="background:var(--moss-soft)">${ICON.needle}</div>
        <div class="tx"><b>${esc(n.size)} mm · ${esc(n.type)}</b><span>${[n.length ? n.length + " cm" : "", n.material, n.count > 1 ? n.count + " stk." : ""].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</span></div></button>`).join("")}</div>`
      : `<div class="card empty-state">${ICON.needle}<b>Ingen pinde endnu</b><span>Skriv dine strikkepinde ind, så kan du hurtigt se, om du har den rigtige størrelse.</span><button class="btn go" data-act="ndEdit">+ Tilføj pinde</button></div>`}`;
    return;
  }
  const q = stashQ.toLowerCase();
  const list = S.yarns.filter(y => (stashW === "alle" || y.weight === stashW) && (!q || [y.brand, y.name, y.color, y.fiber, y.weight].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => (a.brand + a.name).localeCompare(b.brand + b.name, "da"));
  const weights = WEIGHTS.filter(w => S.yarns.some(y => y.weight === w));
  v.innerHTML = `${seg}<div class="sec-title"><h2>Mit garn</h2><button class="chip on" data-act="ynEdit">+ Garn</button></div>
    ${S.yarns.length ? `<input type="search" id="yq" placeholder="Søg efter mærke, farve, fiber…" value="${esc(stashQ)}" aria-label="Søg i garn">
      ${weights.length > 1 ? `<div class="chips"><button class="chip${stashW === "alle" ? " on" : ""}" data-act="stW" data-k="alle">Alle</button>${weights.map(w => `<button class="chip${stashW === w ? " on" : ""}" data-act="stW" data-k="${esc(w)}">${esc(w)}</button>`).join("")}</div>` : ""}
      <div class="list" id="ylist">${list.map(y => {
        const left = yarnLeft(y), used = yarnUsed(y);
        return `<button class="item" data-act="ynEdit" data-id="${y.id}"><div class="sw">${y.photo ? `<img data-blob="${y.photo}" alt="">` : ICON.skein}</div>
          <div class="tx"><b>${esc(y.brand)} ${esc(y.name)}</b><span>${[y.color, y.fiber, y.weight].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</span>
          <span><strong style="color:${left < 0 ? "var(--red)" : "var(--fg)"}">${fmtNum(left)} nøgler tilbage</strong>${used ? ` · ${fmtNum(used)} i projekter` : ""}${y.meters ? ` · ${fmtNum(Math.max(0, left) * y.meters)} m` : ""}</span></div></button>`;
      }).join("") || `<div class="muted small">Intet garn matcher søgningen.</div>`}</div>`
    : `<div class="card empty-state">${ICON.skein}<b>Dit garnlager er tomt</b><span>Tilføj dit garn med billede. Når du lægger garn på et projekt, trækkes det automatisk fra her.</span><button class="btn go" data-act="ynEdit">+ Tilføj garn</button></div>`}`;
  const inp = $("#yq", v);
  if (inp) inp.oninput = () => { stashQ = inp.value; const pos = inp.selectionStart; render(); const n = $("#yq"); n.focus(); n.setSelectionRange(pos, pos); };
}
ACT.stTab = a => { stashTab = a.dataset.k; render(); };
ACT.stW = a => { stashW = a.dataset.k; render(); };
ACT.ynEdit = a => {
  const ex = S.yarns.find(y => y.id === a.dataset.id);
  const y = ex ? { ...ex } : { id: uid(), brand: "", name: "", color: "", fiber: "", weight: "", meters: "", grams: "", skeins: 1, photo: null, notes: "" };
  sheet(`<h3>${ex ? "Rediger garn" : "Nyt garn"}</h3>
    <div class="row"><div class="item" style="width:auto;flex:1"><div class="sw" id="yn-ph">${y.photo ? `<img data-blob="${y.photo}" alt="">` : ICON.skein}</div><div class="tx"><b>Billede</b><span>Tag et billede af nøglet</span></div></div><button class="round" id="yn-cam" aria-label="Tilføj billede">${ICON.camera}</button></div>
    <div class="grid2"><label class="f">Mærke<input type="text" id="yn-brand" value="${esc(y.brand)}" placeholder="F.eks. Sandnes"></label><label class="f">Garn<input type="text" id="yn-name" value="${esc(y.name)}" placeholder="F.eks. Tynn Merinoull"></label></div>
    <div class="grid2"><label class="f">Farve<input type="text" id="yn-color" value="${esc(y.color)}" placeholder="F.eks. Lyng"></label><label class="f">Fiber<input type="text" id="yn-fiber" value="${esc(y.fiber)}" placeholder="F.eks. 100% uld"></label></div>
    <label class="f">Tykkelse<select id="yn-weight"><option value="">Vælg…</option>${WEIGHTS.map(w => `<option${y.weight === w ? " selected" : ""}>${w}</option>`).join("")}</select></label>
    <div class="grid2"><label class="f">Meter pr. nøgle<input type="number" id="yn-m" inputmode="decimal" value="${esc(y.meters)}" placeholder="175"></label><label class="f">Gram pr. nøgle<input type="number" id="yn-g" inputmode="decimal" value="${esc(y.grams)}" placeholder="50"></label></div>
    <label class="f">Antal nøgler du ejer<input type="number" id="yn-n" step="0.5" min="0" inputmode="decimal" value="${esc(y.skeins)}"></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="yn-ok">Gem</button></div>
    ${ex ? `<button class="btn" id="yn-del">Slet garn</button>` : ""}`,
    (el, close) => {
      hydrateImages(el);
      $("#yn-cam", el).onclick = async () => { const id = await pickPhoto(1200); if (!id) return; if (y.photo && y.photo !== ex?.photo) await delBlob(y.photo); y.photo = id; $("#yn-ph", el).innerHTML = `<img data-blob="${id}" alt="">`; hydrateImages(el); };
      $("#yn-ok", el).onclick = async () => {
        Object.assign(y, { brand: $("#yn-brand", el).value.trim(), name: $("#yn-name", el).value.trim() || "Garn", color: $("#yn-color", el).value.trim(), fiber: $("#yn-fiber", el).value.trim(), weight: $("#yn-weight", el).value, meters: num($("#yn-m", el).value, 0) || "", grams: num($("#yn-g", el).value, 0) || "", skeins: num($("#yn-n", el).value, 0) });
        if (ex) { if (ex.photo && ex.photo !== y.photo) await delBlob(ex.photo); Object.assign(ex, y); await save("yarns", ex); }
        else { S.yarns.push(y); await save("yarns", y); }
        close(); rerenderKeepScroll();
      };
      const d = $("#yn-del", el);
      if (d) d.onclick = () => { close(); confirmSheet("Slet garnet fra lageret?", "Ja, slet", async () => {
        await delBlob(ex.photo); S.yarns = S.yarns.filter(x => x !== ex); await DB.del("yarns", ex.id);
        S.projects.forEach(p => { const n = p.yarns.length; p.yarns = p.yarns.filter(u => u.yarnId !== ex.id); if (n !== p.yarns.length) save("projects", p); });
        rerenderKeepScroll();
      }); };
    });
};
ACT.ndEdit = a => {
  const ex = S.needles.find(n => n.id === a.dataset.id);
  const n = ex ? { ...ex } : { id: uid(), size: "", type: NEEDLE_TYPES[0], length: "", material: "", count: 1 };
  sheet(`<h3>${ex ? "Rediger pinde" : "Nye pinde"}</h3>
    <div class="grid2"><label class="f">Størrelse (mm)<input type="number" id="nd-size" step="0.25" min="0" inputmode="decimal" value="${esc(n.size)}" placeholder="4,5"></label>
    <label class="f">Type<select id="nd-type">${NEEDLE_TYPES.map(t => `<option${n.type === t ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
    <div class="grid2"><label class="f">Længde (cm)<input type="number" id="nd-len" inputmode="numeric" value="${esc(n.length)}" placeholder="80"></label>
    <label class="f">Materiale<input type="text" id="nd-mat" value="${esc(n.material)}" placeholder="Bambus, metal…"></label></div>
    <label class="f">Antal<input type="number" id="nd-count" min="1" inputmode="numeric" value="${esc(n.count)}"></label>
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="nd-ok">Gem</button></div>
    ${ex ? `<button class="btn" id="nd-del">Slet</button>` : ""}`,
    (el, close) => {
      $("#nd-ok", el).onclick = async () => {
        Object.assign(n, { size: String(num($("#nd-size", el).value, 0) || "?").replace(".", ","), type: $("#nd-type", el).value, length: $("#nd-len", el).value.trim(), material: $("#nd-mat", el).value.trim(), count: Math.max(1, parseInt($("#nd-count", el).value) || 1) });
        if (ex) { Object.assign(ex, n); await save("needles", ex); } else { S.needles.push(n); await save("needles", n); }
        close(); render();
      };
      const d = $("#nd-del", el);
      if (d) d.onclick = async () => { S.needles = S.needles.filter(x => x !== ex); await DB.del("needles", ex.id); close(); render(); };
    });
};

/* ================= VÆRKTØJER ================= */
let calMode = "ud";
function evenly(S0, n, mode) {
  S0 = Math.floor(S0); n = Math.floor(n);
  if (!(S0 > 0) || !(n > 0)) return null;
  if (mode === "ud") {
    const base = Math.floor(S0 / n), rem = S0 % n;
    const parts = [];
    if (n - rem > 0) parts.push(`*strik ${base}, tag 1 ud* ${n - rem} gange`);
    if (rem > 0) parts.push(`*strik ${base + 1}, tag 1 ud* ${rem} gange`);
    return { text: parts.join(", derefter "), result: S0 + n };
  }
  if (n * 2 > S0) return { err: "Du kan højst tage halvt så mange ind, som du har masker." };
  const g = Math.floor(S0 / n), rem = S0 % n;
  const parts = [];
  const step = k => k > 0 ? `strik ${k}, strik 2 sammen` : "strik 2 sammen";
  if (n - rem > 0) parts.push(`*${step(g - 2)}* ${n - rem} gange`);
  if (rem > 0) parts.push(`*${step(g - 1)}* ${rem} gange`);
  return { text: parts.join(", derefter "), result: S0 - n };
}
function viewTools(v) {
  setTitle("Værktøjer");
  const px = S.meta.pxPerCm || 60;
  v.innerHTML = `
    <section class="card" style="--accent:var(--primary)">
      <div class="head"><h2>Tag jævnt ud / ind</h2></div>
      <div class="chips"><button class="chip${calMode === "ud" ? " on" : ""}" data-act="calMode" data-k="ud">Tag ud</button><button class="chip${calMode === "ind" ? " on" : ""}" data-act="calMode" data-k="ind">Tag ind</button></div>
      <div class="grid2"><label class="f">Masker nu<input type="number" id="ev-s" inputmode="numeric" value="96"></label><label class="f">${calMode === "ud" ? "Tag ud" : "Tag ind"} (antal)<input type="number" id="ev-n" inputmode="numeric" value="12"></label></div>
      <div class="result" id="ev-r"></div>
      <div class="small muted">Til rundstrikning. Strikker du frem og tilbage, så strik de sidste masker uden ud/indtagning.</div>
    </section>

    <section class="card" style="--accent:var(--honey)">
      <div class="head"><h2>Garnberegner</h2></div>
      <div class="grid2"><label class="f">Opskriften bruger (nøgler)<input type="number" id="yc-n" inputmode="decimal" value="6"></label><label class="f">à meter pr. nøgle<input type="number" id="yc-m" inputmode="decimal" value="175"></label></div>
      <label class="f">Dit garn – meter pr. nøgle<input type="number" id="yc-mine" inputmode="decimal" value="200"></label>
      ${S.yarns.some(y => y.meters) ? `<label class="f">…eller vælg fra lageret<select id="yc-pick"><option value="">Vælg garn</option>${S.yarns.filter(y => y.meters).map(y => `<option value="${y.meters}">${esc(y.brand)} ${esc(y.name)} (${y.meters} m)</option>`).join("")}</select></label>` : ""}
      <div class="result" id="yc-r"></div>
    </section>

    <section class="card" style="--accent:var(--moss)">
      <div class="head"><h2>Strikkefasthed</h2></div>
      <div class="grid2"><label class="f">Opskriftens masker på 10 cm<input type="number" id="g-p" inputmode="decimal" value="22"></label><label class="f">Dine masker på 10 cm<input type="number" id="g-m" inputmode="decimal" value="20"></label></div>
      <label class="f">Opskriften siger: slå op<input type="number" id="g-n" inputmode="numeric" value="200"></label>
      <div class="result" id="g-r"></div>
    </section>

    <section class="card" style="--accent:var(--muted)">
      <div class="head"><h2>Lineal</h2><button class="chip ghost" data-act="calib">Kalibrer</button></div>
      <div class="ruler-wrap"><div class="ruler" id="ruler"></div></div>
      <div class="small muted">${S.meta.pxPerCm ? "Linealen er kalibreret til din skærm." : "Tryk Kalibrer første gang, så linealen passer præcist til din skærm."} Læg strikkeprøven op ad skærmen og tæl masker pr. 10 cm.</div>
    </section>`;

  const calc = () => {
    const r = evenly(num($("#ev-s").value), num($("#ev-n").value), calMode);
    $("#ev-r").innerHTML = !r ? "Skriv antal masker og antal ud/indtagninger." : r.err ? esc(r.err) : `<big>${r.result} masker bagefter</big>${esc(r.text)}`;
    const need = num($("#yc-n").value) * num($("#yc-m").value), mine = num($("#yc-mine").value);
    $("#yc-r").innerHTML = need > 0 && mine > 0 ? `<big>${Math.ceil(need / mine)} nøgler</big>Opskriften skal bruge ca. ${fmtNum(need)} m. Køb gerne et ekstra nøgle.` : "Udfyld felterne.";
    const gp = num($("#g-p").value), gm = num($("#g-m").value), gn = num($("#g-n").value);
    $("#g-r").innerHTML = gp > 0 && gm > 0 && gn > 0 ? `<big>Slå ${Math.round(gn * gm / gp)} masker op</big>Det giver samme bredde: ca. ${fmtNum(gn / gp * 10)} cm.${gm !== gp ? ` Med opskriftens antal bliver dit strik ${fmtNum(gn / gm * 10)} cm bredt.` : ""}` : "Udfyld felterne.";
  };
  $$("input", v).forEach(i => i.addEventListener("input", calc));
  const pick = $("#yc-pick", v); if (pick) pick.onchange = () => { if (pick.value) { $("#yc-mine").value = pick.value; calc(); } };
  calc();
  const ru = $("#ruler", v), cm = 30;
  ru.style.width = cm * px + 20 + "px";
  let h = "";
  for (let mm = 0; mm <= cm * 10; mm++) {
    const x = 10 + mm * px / 10, big = mm % 10 === 0, half = mm % 5 === 0;
    h += `<i style="left:${x}px;height:${big ? 32 : half ? 22 : 12}px"></i>`;
    if (big) h += `<em style="left:${x}px">${mm / 10}</em>`;
  }
  ru.innerHTML = h;
}
ACT.calMode = a => { calMode = a.dataset.k; render(); };
ACT.calib = () => {
  let px = S.meta.pxPerCm || 60;
  sheet(`<h3>Kalibrer linealen</h3>
    <p class="muted" style="margin:0">Læg et betalingskort på den stiplede kasse og træk i skyderen, til kassen er præcis lige så bred som kortet.</p>
    <div class="cardbox" id="cb">Betalingskort</div>
    <input type="range" id="cb-r" min="30" max="110" step="0.1" value="${px}" aria-label="Kortets bredde">
    <div class="grid2"><button class="btn" data-close>Annuller</button><button class="btn go" id="cb-ok">Gem</button></div>`,
    (el, close) => {
      const box = $("#cb", el), r = $("#cb-r", el);
      const upd = () => { px = +r.value; box.style.width = (8.56 * px) + "px"; box.style.height = (5.398 * px) + "px"; };
      r.oninput = upd; upd();
      $("#cb-ok", el).onclick = () => { S.meta.pxPerCm = px; saveMeta(); close(); render(); toast("Linealen er kalibreret"); };
    });
};

/* ================= STATISTIK ================= */
const BADGES = [
  { k: "Første pind", t: s => s.rows >= 1, i: '<path d="M6 12l4 4 8-8"/>' },
  { k: "100 pinde", t: s => s.rows >= 100, i: '<path d="M5 19V9M10 19V5M15 19v-7M20 19v-4"/>' },
  { k: "1.000 pinde", t: s => s.rows >= 1000, i: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>' },
  { k: "10.000 pinde", t: s => s.rows >= 10000, i: '<path d="M6 4h12v4a6 6 0 01-12 0zM9 20h6M12 14v6M6 6H3a3 3 0 003 4M18 6h3a3 3 0 01-3 4"/>' },
  { k: "Første færdige", t: s => s.done >= 1, i: '<path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/>' },
  { k: "5 færdige", t: s => s.done >= 5, i: '<path d="M4 20h16M6 20V10l6-6 6 6v10M10 20v-5h4v5"/>' },
  { k: "1 time", t: s => s.time >= 36e5, i: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>' },
  { k: "10 timer", t: s => s.time >= 36e6, i: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2M3 5l3-2M21 5l-3-2"/>' },
  { k: "50 timer", t: s => s.time >= 18e7, i: '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>' },
  { k: "Garnsamler", t: s => s.yarns >= 10, i: '<circle cx="12" cy="12" r="8"/><path d="M5 9c4 1.5 10 1.5 14 0M4.5 14c5 2 10 2 15 0"/>' },
  { k: "Opskriftsamler", t: s => s.pats >= 5, i: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/>' },
  { k: "Mange projekter", t: s => s.projects >= 10, i: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>' }
];
function stats() {
  const rows = Object.values(S.meta.rowsByDay).reduce((a, b) => a + b, 0);
  const time = S.projects.reduce((a, p) => a + p.timeMs + (p.timerStart ? Date.now() - p.timerStart : 0), 0);
  const done = S.projects.filter(p => p.status === "faerdig").length;
  const year = new Date().getFullYear() + "";
  const doneYear = S.projects.filter(p => p.status === "faerdig" && (p.finished || "").startsWith(year)).length;
  const meters = S.projects.reduce((a, p) => a + p.yarns.reduce((b, u) => { const y = S.yarns.find(y => y.id === u.yarnId); return b + (y && y.meters ? u.skeins * y.meters : 0); }, 0), 0);
  return { rows, time, done, doneYear, meters, active: S.projects.filter(p => p.status === "aktiv").length, yarns: S.yarns.length, pats: S.patterns.length, projects: S.projects.length };
}
function viewStats(v) {
  setTitle("Statistik");
  const s = stats();
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); days.push({ k, n: S.meta.rowsByDay[k] || 0, d }); }
  const max = Math.max(1, ...days.map(d => d.n));
  const wk = ["S", "M", "T", "O", "T", "F", "L"];
  v.innerHTML = `
    <div class="tiles">
      <div class="tile"><b>${s.rows.toLocaleString("da-DK")}</b><span>Pinde strikket</span></div>
      <div class="tile"><b>${fmtTime(s.time)}</b><span>Strikketid</span></div>
      <div class="tile"><b>${s.active}</b><span>Projekter i gang</span></div>
      <div class="tile"><b>${s.doneYear}</b><span>Færdige i ${new Date().getFullYear()}</span></div>
      <div class="tile"><b>${s.done}</b><span>Færdige i alt</span></div>
      <div class="tile"><b>${fmtNum(s.meters)} m</b><span>Garn i projekter</span></div>
    </div>
    <section class="card">
      <div class="head"><h2>Pinde de sidste 14 dage</h2></div>
      <div class="bars">${days.map((d, i) => `<div class="bar${i === 13 ? " today" : ""}" style="height:${d.n / max * 100}%" title="${d.n} pinde">${d.n ? `<i>${d.n}</i>` : ""}</div>`).join("")}</div>
      <div class="barlbl">${days.map(d => `<span>${wk[d.d.getDay()]}</span>`).join("")}</div>
    </section>
    <section class="card" style="--accent:var(--honey)">
      <div class="head"><h2>Mærker</h2><span class="small muted">${BADGES.filter(b => b.t(s)).length} af ${BADGES.length}</span></div>
      <div class="badges">${BADGES.map(b => `<div class="badge${b.t(s) ? "" : " off"}"><span class="b"><svg viewBox="0 0 24 24">${b.i}</svg></span>${b.k}</div>`).join("")}</div>
    </section>
    <section class="card" style="--accent:var(--muted)">
      <div class="head"><h2>Sikkerhedskopi</h2></div>
      <div class="small muted">Alt gemmes kun på denne telefon. Gem en kopi en gang imellem – fx i Google Drive eller på mail – så intet går tabt, hvis telefonen skiftes.</div>
      <div class="grid2"><button class="btn go" data-act="backup">Gem kopi</button><button class="btn" data-act="restore">Hent kopi</button></div>
    </section>`;
}
function blobToDataURL(b) { return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }
ACT.backup = async () => {
  toast("Laver sikkerhedskopi…");
  const blobs = await DB.all("blobs");
  const data = { app: "strikketaeller", version: 2, saved: new Date().toISOString(), projects: S.projects, patterns: S.patterns, yarns: S.yarns, needles: S.needles, meta: S.meta, blobs: [] };
  for (const b of blobs) data.blobs.push({ id: b.id, data: await blobToDataURL(b.blob) });
  const file = new Blob([JSON.stringify(data)], { type: "application/json" });
  const name = `strikkemonster-kopi-${today()}.json`;
  try {
    const f = new File([file], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Strikkemonster – sikkerhedskopi" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast("Kopien er gemt i Overførsler");
};
ACT.restore = async () => {
  const [f] = await pickFile("application/json,.json");
  if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); if (data.app !== "strikketaeller") throw 0; } catch (e) { toast("Det er ikke en kopi fra Strikkemonster"); return; }
  confirmSheet("Erstat alt i appen med kopien?", "Ja, erstat", async () => {
    for (const s of STORES) await DB.clear(s);
    for (const b of data.blobs || []) { const blob = await (await fetch(b.data)).blob(); await DB.put("blobs", { id: b.id, blob }); }
    for (const s of ["projects", "patterns", "yarns", "needles"]) for (const o of data[s] || []) await DB.put(s, o);
    await DB.put("meta", { ...data.meta, id: "meta" });
    toast("Kopien er hentet"); setTimeout(() => location.reload(), 600);
  });
};

/* ================= TEMA OG OPSTART ================= */
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
function isDark() { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
function paintIcon() { $("#themeIcon").innerHTML = isDark() ? SUN : MOON; }
$("#themeBtn").onclick = () => { const t = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("strikketaeller-tema", t); } catch (e) {} paintIcon(); };
paintIcon();

let lock = null;
async function keepAwake() { try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch (e) {} }
document.addEventListener("visibilitychange", keepAwake);
document.addEventListener("click", () => { if (!lock) keepAwake(); }, { once: true });

(async function start() {
  try {
    await DB.open();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    const [projects, patterns, yarns, needles, meta] = await Promise.all(["projects", "patterns", "yarns", "needles"].map(s => DB.all(s)).concat(DB.get("meta", "meta")));
    Object.assign(S, { projects, patterns, yarns, needles });
    if (meta) S.meta = { rowsByDay: {}, ...meta };
    await migrateOld();
    S.projects.forEach(p => { p.yarns = p.yarns || []; p.counters = p.counters?.length ? p.counters : [newCounter("Pind")]; });
  } catch (e) {
    console.error(e);
    $("#view").innerHTML = `<div class="card empty-state"><b>Appen kunne ikke åbne sin database</b><span>Prøv at åbne den i Chrome eller Safari – ikke i privat tilstand.</span></div>`;
    return;
  }
  // Gå direkte til eneste aktive projekt første gang
  if (!location.hash) { const act = S.projects.filter(p => p.status === "aktiv"); if (act.length === 1) { location.replace("#/projekt/" + act[0].id); } }
  render();
})();

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
