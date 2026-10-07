/* Bottega — editor HTML/CSS/JS con anteprima live.
   Tutto gira nel browser: i progetti si salvano in localStorage,
   i link di condivisione portano il codice compresso dopo il # dell'indirizzo. */
(() => {
"use strict";
const $ = s => document.querySelector(s);

/* ---------------- archivio locale ---------------- */
const KEY = "bottega.";
const store = {
  ok: true,
  get(k){ try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } },
  set(k, v){ localStorage.setItem(KEY + k, JSON.stringify(v)); },      // può lanciare QuotaExceededError
  del(k){ try { localStorage.removeItem(KEY + k); } catch {} }
};
try { localStorage.setItem(KEY + "test", "1"); localStorage.removeItem(KEY + "test"); } catch { store.ok = false; }

const index = () => (store.get("index") || []).filter(x => x && x.id);
function writeIndex(list){ store.set("index", list.sort((a, b) => b.updatedAt - a.updatedAt)); }
function readProject(id){ const p = store.get("p." + id); return p ? normalize(p) : null; }
function writeProject(p){
  store.set("p." + p.id, p);
  const list = index().filter(x => x.id !== p.id);
  list.push({ id: p.id, title: p.title, updatedAt: p.updatedAt });
  writeIndex(list);
}
function deleteProject(id){ store.del("p." + id); try { writeIndex(index().filter(x => x.id !== id)); } catch {} }

const STARTER = {
  title: "Il mio primo progetto",
  html: `<main class="card">
  <p class="eyebrow">Bottega</p>
  <h1>Ciao! Modifica il codice qui sopra.</h1>
  <p>L'anteprima si aggiorna mentre scrivi.</p>
  <button id="btn">Clic: <span id="n">0</span></button>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: #f2efe9;
  color: #1d2230;
}
.card {
  max-width: 28rem;
  padding: 2rem;
  border-radius: 14px;
  background: white;
  box-shadow: 0 10px 30px rgb(0 0 0 / .08);
}
.eyebrow {
  margin: 0;
  font-size: .75rem;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #0a7564;
}
h1 { margin: .3rem 0 .5rem; line-height: 1.15; }
button {
  font: inherit;
  padding: .6rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #0a7564;
  color: white;
  cursor: pointer;
  transition: transform .1s;
}
button:active { transform: scale(.96); }`,
  js: `const btn = document.getElementById("btn");
const n = document.getElementById("n");
let count = 0;

btn.addEventListener("click", () => {
  count++;
  n.textContent = count;
  console.log("Clic numero", count);
});`
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function normalize(x){
  return {
    id: x.id || newId(), title: String(x.title || "Senza titolo").slice(0, 80),
    html: String(x.html || ""), css: String(x.css || ""), js: String(x.js || ""),
    cssLibs: Array.isArray(x.cssLibs) ? x.cssLibs.map(String) : [], jsLibs: Array.isArray(x.jsLibs) ? x.jsLibs.map(String) : [],
    createdAt: x.createdAt || Date.now(), updatedAt: x.updatedAt || Date.now()
  };
}
const fresh = base => normalize(Object.assign({}, base, { id: newId(), createdAt: Date.now(), updatedAt: Date.now() }));

/* ---------------- stato ---------------- */
const S = { mode: "edit", project: null, dirty: false, timer: 0 };

/* ---------------- editor ---------------- */
const mk = (id, mode, extra = {}) => CodeMirror($(id), Object.assign({
  mode, theme: "bottega", lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2,
  autoCloseBrackets: true, matchBrackets: true,
  extraKeys: {
    "Ctrl-S": () => saveNow(true), "Cmd-S": () => saveNow(true),
    "Ctrl-Enter": () => run(), "Cmd-Enter": () => run(),
    "Tab": cm => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("  ", "end")
  }
}, extra));
const ED = {
  html: mk("#ed-html", "htmlmixed", { autoCloseTags: true }),
  css: mk("#ed-css", "css"),
  js: mk("#ed-js", "javascript")
};
for (const [k, cm] of Object.entries(ED)) {
  cm.on("change", (_, ch) => { meta(k); if (ch.origin !== "setValue") onEdit(); });
}
function meta(k){ const n = ED[k].lineCount(); $("#m-" + k).textContent = n + (n === 1 ? " riga" : " righe"); }
$("#title").addEventListener("input", () => onEdit(false));

function load(p){
  S.project = p;
  $("#title").value = p.title;
  ED.html.setValue(p.html); ED.css.setValue(p.css); ED.js.setValue(p.js);
  for (const cm of Object.values(ED)) cm.clearHistory();
  S.dirty = false;
  document.title = p.title + " · Bottega";
  run();
}
function collect(){
  const p = S.project;
  p.title = $("#title").value.trim() || "Senza titolo";
  p.html = ED.html.getValue(); p.css = ED.css.getValue(); p.js = ED.js.getValue();
  return p;
}

/* ---------------- anteprima + console ---------------- */
const HOOK = `<script>(function(){var P=parent;function f(a){try{if(a instanceof Error)return a.stack||String(a);if(typeof a==="object"&&a!==null){return JSON.stringify(a,function(k,v){return typeof v==="function"?"ƒ "+(v.name||""):v},2)}return String(a)}catch(e){return String(a)}}["log","info","warn","error","debug"].forEach(function(t){var o=console[t];console[t]=function(){var a=[].slice.call(arguments).map(f).join(" ");P.postMessage({__bottega:1,t:t,m:a},"*");o&&o.apply(console,arguments)}});window.addEventListener("error",function(e){P.postMessage({__bottega:1,t:"error",m:(e.message||"Errore")+(e.lineno?" (riga "+e.lineno+")":"")},"*")});window.addEventListener("unhandledrejection",function(e){P.postMessage({__bottega:1,t:"error",m:"Promise rifiutata: "+f(e.reason)},"*")})})();<\/script>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const safeScript = s => s.replace(/<\/script/gi, "<\\/script");
const safeStyle = s => s.replace(/<\/style/gi, "<\\/style");

function buildPreview(p){
  const cssL = p.cssLibs.map(u => `<link rel="stylesheet" href="${esc(u)}">`).join("");
  const jsL = p.jsLibs.map(u => `<script src="${esc(u)}"><\/script>`).join("");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${HOOK}${cssL}<style>${safeStyle(p.css)}</style></head><body>${p.html}\n${jsL}<script>${safeScript(p.js)}\n<\/script></body></html>`;
}
let runT = 0;
function run(){
  clearTimeout(runT);
  if (!S.project) return;
  if (S.mode === "edit") collect();
  clearLogs();
  $("#preview").srcdoc = buildPreview(S.project);
}
const runSoon = () => { clearTimeout(runT); runT = setTimeout(run, 450); };
$("#runBtn").onclick = run;

let errs = 0;
window.addEventListener("message", e => {
  if (e.source !== $("#preview").contentWindow || !e.data || !e.data.__bottega) return;
  addLog(e.data.t, e.data.m);
});
function addLog(t, m){
  const L = $("#logs"); const empty = L.querySelector(".empty"); if (empty) empty.remove();
  if (L.children.length > 400) L.firstElementChild.remove();
  const d = document.createElement("div"); d.className = "log " + t; d.textContent = String(m).slice(0, 5000);
  L.appendChild(d); L.scrollTop = L.scrollHeight;
  if (t === "error") { errs++; $("#errBadge").textContent = errs; $("#errBadge").hidden = false; }
}
function clearLogs(){
  $("#logs").innerHTML = '<div class="log empty">Qui compaiono console.log ed errori del tuo JS.</div>';
  errs = 0; $("#errBadge").hidden = true;
}
$("#clearLogs").onclick = clearLogs;
$("#consoleBtn").onclick = () => {
  const c = $("#console"); c.hidden = !c.hidden; $("#consoleBtn").setAttribute("aria-pressed", String(!c.hidden));
  try { store.set("console", !c.hidden); } catch {}
};
if (store.get("console")) { $("#console").hidden = false; $("#consoleBtn").setAttribute("aria-pressed", "true"); }

/* ---------------- disposizione ---------------- */
const work = $("#work");
const pref = (k, v) => { try { store.set(k, v); } catch {} };
function refreshEditors(){ requestAnimationFrame(() => Object.values(ED).forEach(cm => cm.refresh())); }
function setLayout(l){ document.body.dataset.layout = l; pref("layout", l); refreshEditors(); }
setLayout(store.get("layout") || "top");
const sp = store.get("split"); if (sp) work.style.setProperty("--split", sp + "%");
$("#layoutBtn").onclick = () => setLayout(document.body.dataset.layout === "top" ? "side" : "top");

const split = $("#split");
split.addEventListener("pointerdown", e => {
  split.setPointerCapture(e.pointerId); split.classList.add("drag"); document.body.classList.add("dragging");
  const r = work.getBoundingClientRect(); const top = document.body.dataset.layout === "top";
  const move = ev => {
    const pct = Math.max(12, Math.min(85, top ? (ev.clientY - r.top) / r.height * 100 : (ev.clientX - r.left) / r.width * 100));
    work.style.setProperty("--split", pct.toFixed(1) + "%");
  };
  const up = () => {
    split.removeEventListener("pointermove", move); split.removeEventListener("pointerup", up);
    split.classList.remove("drag"); document.body.classList.remove("dragging");
    pref("split", parseFloat(work.style.getPropertyValue("--split"))); refreshEditors();
  };
  split.addEventListener("pointermove", move); split.addEventListener("pointerup", up);
});
split.addEventListener("keydown", e => {
  const cur = parseFloat(work.style.getPropertyValue("--split")) || 46;
  const d = (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -3 : (e.key === "ArrowDown" || e.key === "ArrowRight") ? 3 : 0;
  if (!d) return; e.preventDefault();
  const v = Math.max(12, Math.min(85, cur + d)); work.style.setProperty("--split", v + "%"); pref("split", v); refreshEditors();
});

document.body.dataset.tab = "html";
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.body.dataset.tab = b.dataset.t;
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  if (b.dataset.t !== "out") ED[b.dataset.t].refresh();
});

/* ---------------- interfaccia ---------------- */
let toastT = 0;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2800); }
const hhmm = ts => new Date(ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
function when(ts){
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return "oggi alle " + hhmm(ts);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "ieri alle " + hhmm(ts);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
function status(s, text){ $("#status").dataset.s = s; $("#statusText").textContent = text; }
function banner(html, err){ const b = $("#banner"); if (!html) { b.hidden = true; return; } $("#bannerText").innerHTML = html; b.classList.toggle("err", !!err); b.hidden = false; }
function openSheet(id){ $(id).hidden = false; const f = $(id).querySelector(".field,.choice,button.primary"); f && f.focus(); }
function closeSheets(){ document.querySelectorAll(".scrim").forEach(s => s.hidden = true); }
document.querySelectorAll(".scrim").forEach(s => s.addEventListener("click", e => {
  if (e.target === s || e.target.closest("[data-close]")) s.hidden = true;
}));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSheets();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveNow(true); }
});

/* ---------------- salvataggio automatico ---------------- */
function onEdit(rerun = true){
  if (S.mode !== "edit") return;
  S.dirty = true;
  if (rerun) runSoon();
  if (!store.ok) return;
  status("pending", "Modifiche non salvate");
  clearTimeout(S.timer); S.timer = setTimeout(() => saveNow(false), 700);
}
function saveNow(manual){
  clearTimeout(S.timer);
  if (S.mode !== "edit" || !S.project) return true;
  if (!store.ok) { if (manual) toast("Questo browser non permette il salvataggio: usa Scarica."); return false; }
  if (!S.dirty) { if (manual) toast("Già salvato"); return true; }
  const p = collect(); p.updatedAt = Date.now();
  try {
    writeProject(p);
    store.set("last", p.id);
    S.dirty = false;
    document.title = p.title + " · Bottega";
    status("saved", "Salvato alle " + hhmm(p.updatedAt));
    banner("");
    if (manual) toast("Salvato");
    return true;
  } catch (e) {
    status("error", "Non salvato: spazio del browser pieno");
    banner("<b>Lo spazio di salvataggio del browser è pieno.</b> Scarica i progetti che ti servono ed elimina quelli vecchi da “Progetti”.", true);
    return false;
  }
}
window.addEventListener("beforeunload", () => saveNow(false));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(false); });

/* ---------------- progetti ---------------- */
function openProject(p){
  if (S.mode === "view") leaveView();
  saveNow(false);
  load(p);
  try { store.set("last", p.id); } catch {}
  status("saved", "Salvato " + when(p.updatedAt));
}
function createProject(base){
  saveNow(false);
  const p = fresh(base);
  if (S.mode === "view") leaveView();
  load(p); S.dirty = true; saveNow(false);
  return p;
}
function newProject(){ closeSheets(); createProject({ title: "Senza titolo" }); ED.html.focus(); }
$("#newBtn").onclick = newProject; $("#newBtn2").onclick = newProject;
$("#listBtn").onclick = () => { saveNow(false); renderList(); openSheet("#listSheet"); };

function renderList(){
  const ul = $("#plist"); ul.innerHTML = "";
  if (!store.ok) { ul.innerHTML = '<li class="empty">Questo browser blocca il salvataggio (forse è in modalità privata). Puoi lavorare, ma ricordati di usare Scarica.</li>'; return; }
  const items = index();
  if (!items.length) { ul.innerHTML = '<li class="empty">Nessun progetto ancora.</li>'; return; }
  for (const it of items) {
    const cur = S.mode === "edit" && S.project && it.id === S.project.id;
    const li = document.createElement("li"); li.className = "pitem" + (cur ? " cur" : "");
    const nm = document.createElement("button"); nm.className = "nm"; nm.textContent = it.title || "Senza titolo";
    nm.onclick = () => {
      closeSheets(); if (cur) return;
      const p = readProject(it.id); if (p) openProject(p); else { deleteProject(it.id); toast("Questo progetto non esiste più."); }
    };
    const wh = document.createElement("div"); wh.className = "when"; wh.textContent = "Modificato " + when(it.updatedAt);
    const acts = document.createElement("div"); acts.className = "acts";
    const dup = document.createElement("button"); dup.className = "btn ghost icon"; dup.title = "Duplica";
    dup.innerHTML = '<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>';
    dup.onclick = () => {
      const src = cur ? collect() : readProject(it.id); if (!src) return;
      closeSheets(); createProject(Object.assign({}, src, { title: src.title + " (copia)" })); toast("Copia creata");
    };
    const del = document.createElement("button"); del.className = "btn ghost icon"; del.title = "Elimina";
    del.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>';
    del.onclick = () => {
      if (li.querySelector(".confirm")) return;
      const c = document.createElement("div"); c.className = "confirm";
      const t = document.createElement("span"); t.textContent = "Eliminare definitivamente?";
      const y = document.createElement("button"); y.className = "btn danger"; y.style.height = "28px"; y.textContent = "Elimina";
      const n = document.createElement("button"); n.className = "btn"; n.style.height = "28px"; n.textContent = "Annulla";
      y.onclick = () => {
        deleteProject(it.id); toast("Progetto eliminato");
        if (cur) {
          S.dirty = false;
          const next = index()[0]; const p = next && readProject(next.id);
          if (p) openProject(p); else createProject({ title: "Senza titolo" });
        }
        renderList();
      };
      n.onclick = () => c.remove();
      c.append(t, y, n); li.appendChild(c);
    };
    acts.append(dup, del);
    li.append(nm, acts, wh); ul.appendChild(li);
  }
}

/* ---------------- librerie ---------------- */
$("#libsBtn").onclick = () => {
  $("#jsLibs").value = S.project.jsLibs.join("\n");
  $("#cssLibs").value = S.project.cssLibs.join("\n");
  openSheet("#libsSheet");
};
const urls = v => v.split(/\s+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s)).slice(0, 20);
$("#saveLibs").onclick = () => {
  S.project.jsLibs = urls($("#jsLibs").value); S.project.cssLibs = urls($("#cssLibs").value);
  closeSheets(); onEdit(false); run(); toast("Librerie applicate");
};

/* ---------------- condivisione (codice nel link) ---------------- */
const pack = p => LZString.compressToEncodedURIComponent(JSON.stringify({ v: 1, t: p.title, h: p.html, c: p.css, j: p.js, cl: p.cssLibs, jl: p.jsLibs }));
function unpack(s){
  try {
    const o = JSON.parse(LZString.decompressFromEncodedURIComponent(s));
    if (!o || typeof o !== "object") return null;
    return normalize({ title: o.t, html: o.h, css: o.c, js: o.j, cssLibs: o.cl, jsLibs: o.jl });
  } catch { return null; }
}
const baseUrl = () => location.href.split("#")[0];
$("#shareBtn").onclick = () => {
  saveNow(false);
  const link = baseUrl() + "#c=" + pack(collect());
  $("#shareLink").value = link;
  const w = $("#shareWarn");
  if (link.length > 8000) { w.hidden = false; w.textContent = "Il link è molto lungo (" + link.length.toLocaleString("it-IT") + " caratteri): alcune app di messaggistica potrebbero tagliarlo. Per progetti grandi condividi il file .html da Scarica."; }
  else w.hidden = true;
  openSheet("#shareSheet");
};
$("#copyLink").onclick = async () => {
  const el = $("#shareLink");
  try { await navigator.clipboard.writeText(el.value); toast("Link copiato"); }
  catch { el.focus(); el.select(); toast("Selezionato: premi Ctrl+C per copiare"); }
};

let editBackup = null;
function enterView(p){
  if (S.mode === "edit") { saveNow(false); editBackup = S.project; }
  S.mode = "view"; document.body.classList.add("view");
  Object.values(ED).forEach(cm => cm.setOption("readOnly", true));
  $("#title").disabled = true;
  load(p);
  status("saved", "Progetto condiviso");
  banner("Stai guardando un progetto condiviso. Per modificarlo, <b>salva una copia</b> nei tuoi progetti.");
}
function leaveView(){
  S.mode = "edit"; document.body.classList.remove("view");
  Object.values(ED).forEach(cm => cm.setOption("readOnly", false));
  $("#title").disabled = false; banner("");
  try { history.replaceState(null, "", baseUrl()); } catch {}
}
$("#copyBtn").onclick = () => {
  const src = S.project;
  leaveView();
  createProject({ title: src.title, html: src.html, css: src.css, js: src.js, cssLibs: src.cssLibs, jsLibs: src.jsLibs });
  toast("Copia salvata nei tuoi progetti");
};
function readHash(){
  const h = location.hash;
  if (!h.startsWith("#c=")) return false;
  const p = unpack(h.slice(3));
  if (!p) { toast("Il link condiviso è incompleto o danneggiato."); return false; }
  enterView(p); return true;
}
window.addEventListener("hashchange", () => { if (!readHash() && S.mode === "view") { leaveView(); startEditor(); } });

/* ---------------- scaricare ---------------- */
function slug(s){ return (s || "progetto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "progetto"; }
function download(blob, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const indent = (s, pad) => s.split("\n").map(l => l ? pad + l : l).join("\n");
const libTags = (p, pad) => ({
  css: p.cssLibs.map(u => `${pad}<link rel="stylesheet" href="${esc(u)}">\n`).join(""),
  js: p.jsLibs.map(u => `${pad}<script src="${esc(u)}"><\/script>\n`).join("")
});
function singleHtml(p){
  const L = libTags(p, "  ");
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)}</title>
${L.css}  <style>
${indent(safeStyle(p.css), "    ")}
  </style>
</head>
<body>
${p.html}

${L.js}  <script>
${indent(safeScript(p.js), "    ")}
  <\/script>
</body>
</html>
`;
}
function zipIndex(p){
  const L = libTags(p, "  ");
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)}</title>
${L.css}  <link rel="stylesheet" href="style.css">
</head>
<body>
${p.html}

${L.js}  <script src="script.js"><\/script>
</body>
</html>
`;
}
const current = () => S.mode === "edit" ? (saveNow(false), collect()) : S.project;
$("#exportBtn").onclick = () => openSheet("#exportSheet");
$("#dlHtml").onclick = () => {
  const p = current();
  download(new Blob([singleHtml(p)], { type: "text/html;charset=utf-8" }), slug(p.title) + ".html");
  closeSheets(); toast("File .html scaricato");
};
$("#dlZip").onclick = async () => {
  const p = current();
  const zip = new JSZip(); const dir = zip.folder(slug(p.title));
  dir.file("index.html", zipIndex(p)); dir.file("style.css", p.css); dir.file("script.js", p.js);
  dir.file("bottega.json", JSON.stringify({ app: "Bottega", version: 1, title: p.title, cssLibs: p.cssLibs, jsLibs: p.jsLibs }, null, 2));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  download(blob, slug(p.title) + ".zip");
  closeSheets(); toast("File .zip scaricato");
};

/* ---------------- importare (.zip o .html) ---------------- */
function parseHtml(text){
  const doc = new DOMParser().parseFromString(text, "text/html");
  const out = { title: (doc.title || "").trim(), css: [], js: [], cssLibs: [], jsLibs: [] };
  doc.querySelectorAll("style").forEach(s => { out.css.push(dedent(s.textContent)); s.remove(); });
  doc.querySelectorAll("link[rel~='stylesheet']").forEach(l => { const h = l.getAttribute("href") || ""; if (/^https?:\/\//i.test(h)) out.cssLibs.push(h); l.remove(); });
  doc.querySelectorAll("script").forEach(s => {
    const src = s.getAttribute("src");
    if (src) { if (/^https?:\/\//i.test(src)) out.jsLibs.push(src); }
    else out.js.push(dedent(s.textContent));
    s.remove();
  });
  out.html = doc.body ? dedent(doc.body.innerHTML.replace(/^\s*\n/, "")).replace(/\s+$/, "") : "";
  return out;
}
function dedent(s){
  const lines = s.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
  const pads = lines.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length);
  const m = pads.length ? Math.min(...pads) : 0;
  return lines.map(l => l.slice(Math.min(m, l.match(/^[ \t]*/)[0].length))).join("\n");
}
$("#importBtn").onclick = () => $("#fileInput").click();
$("#fileInput").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    let p;
    if (/\.html?$/i.test(f.name)) {
      const r = parseHtml(await f.text());
      p = { title: r.title || f.name.replace(/\.html?$/i, ""), html: r.html, css: r.css.join("\n\n"), js: r.js.join("\n\n"), cssLibs: r.cssLibs, jsLibs: r.jsLibs };
    } else {
      const zip = await JSZip.loadAsync(f);
      const files = Object.values(zip.files).filter(x => !x.dir && !/(^|\/)(__MACOSX|node_modules)\//.test(x.name) && !/(^|\/)\./.test(x.name));
      const pick = (re, pref) => files.find(x => new RegExp("(^|/)" + pref + "$", "i").test(x.name)) || files.find(x => re.test(x.name));
      const fh = pick(/\.html?$/i, "index\\.html"), fc = pick(/\.css$/i, "style\\.css"), fj = pick(/\.js$/i, "script\\.js"), fm = pick(/bottega\.json$/i, "bottega\\.json");
      if (!fh && !fc && !fj) { toast("Nello zip non ho trovato file .html, .css o .js."); return; }
      const r = fh ? parseHtml(await fh.async("string")) : { title: "", html: "", css: [], js: [], cssLibs: [], jsLibs: [] };
      let m = null; try { m = fm ? JSON.parse(await fm.async("string")) : null; } catch {}
      const css = [fc ? await fc.async("string") : "", ...r.css].filter(Boolean).join("\n\n");
      const js = [fj ? await fj.async("string") : "", ...r.js].filter(Boolean).join("\n\n");
      p = { title: (m && m.title) || r.title || f.name.replace(/\.zip$/i, ""), html: r.html, css, js,
            cssLibs: m && Array.isArray(m.cssLibs) ? m.cssLibs : r.cssLibs, jsLibs: m && Array.isArray(m.jsLibs) ? m.jsLibs : r.jsLibs };
    }
    closeSheets();
    const np = createProject(p);
    toast("Importato: " + np.title);
  } catch (err) { toast("Non riesco a leggere questo file."); }
};

/* ---------------- avvio ---------------- */
function startEditor(){
  const last = store.get("last");
  const p = (last && readProject(last)) || (index()[0] && readProject(index()[0].id));
  if (p) { load(p); status("saved", "Salvato " + when(p.updatedAt)); return; }
  load(fresh(STARTER)); S.dirty = true; saveNow(false);
}
["html", "css", "js"].forEach(meta);
if (!store.ok) banner("<b>Questo browser non permette il salvataggio automatico</b> (forse sei in navigazione privata). Puoi lavorare lo stesso, ma usa <b>Scarica</b> prima di chiudere.", true);
if (!readHash()) startEditor();
if (!store.ok) status("error", "Salvataggio non disponibile");
})();
