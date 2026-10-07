/* EditorHTML_CSS_JS — editor HTML/CSS/JS con anteprima live.
   Il lavoro si salva da solo nella sessione della scheda (sessionStorage): resiste al ricaricamento
   della pagina, ma alla chiusura della scheda o del browser sparisce. Per conservarlo si scarica .html/.zip. */
(() => {
"use strict";
const $ = s => document.querySelector(s);
const APP = "EditorHTML_CSS_JS";

/* ---------------- archivi ---------------- */
const ss = {
  ok: true,
  get(k){ try { return JSON.parse(sessionStorage.getItem("ed." + k)); } catch { return null; } },
  set(k, v){ sessionStorage.setItem("ed." + k, JSON.stringify(v)); },
  del(k){ try { sessionStorage.removeItem("ed." + k); } catch {} }
};
try { sessionStorage.setItem("ed.test", "1"); sessionStorage.removeItem("ed.test"); } catch { ss.ok = false; }
const prefs = {   // solo preferenze di visualizzazione, nessun codice
  get(k){ try { return JSON.parse(localStorage.getItem("ed.pref." + k)); } catch { return null; } },
  set(k, v){ try { localStorage.setItem("ed.pref." + k, JSON.stringify(v)); } catch {} }
};

const STARTER = {
  title: "Il mio progetto",
  html: `<main class="card">
  <p class="eyebrow">EditorHTML_CSS_JS</p>
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
function normalize(x){
  return {
    title: String(x.title || "Senza titolo").slice(0, 80),
    html: String(x.html || ""), css: String(x.css || ""), js: String(x.js || ""),
    cssLibs: Array.isArray(x.cssLibs) ? x.cssLibs.map(String) : [], jsLibs: Array.isArray(x.jsLibs) ? x.jsLibs.map(String) : []
  };
}

/* ---------------- stato ---------------- */
const S = { project: null, timer: 0, dlSig: "" };
const sig = p => JSON.stringify([p.title, p.html, p.css, p.js, p.cssLibs, p.jsLibs]);
const undownloaded = () => S.project && sig(collect()) !== S.dlSig;

/* ---------------- editor ---------------- */
const mk = (id, mode, extra = {}) => CodeMirror($(id), Object.assign({
  mode, theme: "editor", lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2,
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
for (const [k, cm] of Object.entries(ED)) cm.on("change", (_, ch) => { meta(k); if (ch.origin !== "setValue") onEdit(); });
function meta(k){ const n = ED[k].lineCount(); $("#m-" + k).textContent = n + (n === 1 ? " riga" : " righe"); }
$("#title").addEventListener("input", () => onEdit(false));

function load(p, dlSig){
  S.project = p;
  $("#title").value = p.title;
  ED.html.setValue(p.html); ED.css.setValue(p.css); ED.js.setValue(p.js);
  for (const cm of Object.values(ED)) cm.clearHistory();
  S.dlSig = dlSig === undefined ? sig(p) : dlSig;   // un progetto appena aperto non ha nulla da scaricare
  document.title = p.title + " · " + APP;
  run();
}
function collect(){
  const p = S.project;
  p.title = $("#title").value.trim() || "Senza titolo";
  p.html = ED.html.getValue(); p.css = ED.css.getValue(); p.js = ED.js.getValue();
  return p;
}

/* ---------------- anteprima + console ---------------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const safeScript = s => s.replace(/<\/script/gi, "<\\/script");
const safeStyle = s => s.replace(/<\/style/gi, "<\\/style");
const HOOK = `<script>(function(){var P=parent;function f(a){try{if(a instanceof Error)return a.stack||String(a);if(typeof a==="object"&&a!==null){return JSON.stringify(a,function(k,v){return typeof v==="function"?"ƒ "+(v.name||""):v},2)}return String(a)}catch(e){return String(a)}}["log","info","warn","error","debug"].forEach(function(t){var o=console[t];console[t]=function(){var a=[].slice.call(arguments).map(f).join(" ");P.postMessage({__ed:1,t:t,m:a},"*");o&&o.apply(console,arguments)}});window.addEventListener("error",function(e){P.postMessage({__ed:1,t:"error",m:(e.message||"Errore")+(e.lineno?" (riga "+e.lineno+")":"")},"*")});window.addEventListener("unhandledrejection",function(e){P.postMessage({__ed:1,t:"error",m:"Promise rifiutata: "+f(e.reason)},"*")})})();<\/script>`;
function buildPreview(p){
  const cssL = p.cssLibs.map(u => `<link rel="stylesheet" href="${esc(u)}">`).join("");
  const jsL = p.jsLibs.map(u => `<script src="${esc(u)}"><\/script>`).join("");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${HOOK}${cssL}<style>${safeStyle(p.css)}</style></head><body>${p.html}\n${jsL}<script>${safeScript(p.js)}\n<\/script></body></html>`;
}
let runT = 0;
function run(){ clearTimeout(runT); if (!S.project) return; collect(); clearLogs(); $("#preview").srcdoc = buildPreview(S.project); }
const runSoon = () => { clearTimeout(runT); runT = setTimeout(run, 450); };
$("#runBtn").onclick = run;
let errs = 0;
window.addEventListener("message", e => {
  if (e.source !== $("#preview").contentWindow || !e.data || !e.data.__ed) return;
  addLog(e.data.t, e.data.m);
});
function addLog(t, m){
  const L = $("#logs"); const empty = L.querySelector(".empty"); if (empty) empty.remove();
  if (L.children.length > 400) L.firstElementChild.remove();
  const d = document.createElement("div"); d.className = "log " + t; d.textContent = String(m).slice(0, 5000);
  L.appendChild(d); L.scrollTop = L.scrollHeight;
  if (t === "error") { errs++; $("#errBadge").textContent = errs; $("#errBadge").hidden = false; }
}
function clearLogs(){ $("#logs").innerHTML = '<div class="log empty">Qui compaiono console.log ed errori del tuo JS.</div>'; errs = 0; $("#errBadge").hidden = true; }
$("#clearLogs").onclick = clearLogs;
$("#consoleBtn").onclick = () => {
  const c = $("#console"); c.hidden = !c.hidden; $("#consoleBtn").setAttribute("aria-pressed", String(!c.hidden)); prefs.set("console", !c.hidden);
};
if (prefs.get("console")) { $("#console").hidden = false; $("#consoleBtn").setAttribute("aria-pressed", "true"); }

/* ---------------- disposizione ---------------- */
const work = $("#work");
function refreshEditors(){ requestAnimationFrame(() => Object.values(ED).forEach(cm => cm.refresh())); }
function setLayout(l){ document.body.dataset.layout = l; prefs.set("layout", l); refreshEditors(); }
setLayout(prefs.get("layout") || "top");
const sp = prefs.get("split"); if (sp) work.style.setProperty("--split", sp + "%");
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
    prefs.set("split", parseFloat(work.style.getPropertyValue("--split"))); refreshEditors();
  };
  split.addEventListener("pointermove", move); split.addEventListener("pointerup", up);
});
split.addEventListener("keydown", e => {
  const cur = parseFloat(work.style.getPropertyValue("--split")) || 46;
  const d = (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -3 : (e.key === "ArrowDown" || e.key === "ArrowRight") ? 3 : 0;
  if (!d) return; e.preventDefault();
  const v = Math.max(12, Math.min(85, cur + d)); work.style.setProperty("--split", v + "%"); prefs.set("split", v); refreshEditors();
});
document.body.dataset.tab = "html";
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.body.dataset.tab = b.dataset.t;
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  if (b.dataset.t !== "out") ED[b.dataset.t].refresh();
});

/* ---------------- interfaccia ---------------- */
let toastT = 0;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3000); }
const hhmm = ts => new Date(ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
function status(s, text){ $("#status").dataset.s = s; $("#statusText").textContent = text; }
function showSaved(ts){
  status(undownloaded() ? "pending" : "saved", "Salvato alle " + hhmm(ts) + (undownloaded() ? " · da scaricare" : ""));
}
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

/* ---------------- salvataggio nella sessione ---------------- */
function onEdit(rerun = true){
  if (!S.project) return;
  if (rerun) runSoon();
  status("pending", "Modifiche in corso…");
  clearTimeout(S.timer); S.timer = setTimeout(() => saveNow(false), 500);
}
function saveNow(manual){
  clearTimeout(S.timer);
  if (!S.project) return;
  if (!ss.ok) { if (manual) toast("Questo browser non permette il salvataggio automatico: usa Scarica."); return; }
  const now = Date.now();
  try {
    ss.set("session", { p: collect(), dlSig: S.dlSig, at: now });
    document.title = S.project.title + " · " + APP;
    showSaved(now);
    if (manual) toast(undownloaded() ? "Salvato. Ricordati di scaricarlo prima di chiudere." : "Salvato");
  } catch {
    status("error", "Non salvato: progetto troppo grande");
    banner("<b>Il progetto è troppo grande per il salvataggio automatico.</b> Scaricalo spesso con il pulsante Scarica.", true);
  }
}
setInterval(() => { try { const s = ss.get("session"); if (s) { s.at = Date.now(); ss.set("session", s); } } catch {} }, 20000);
window.addEventListener("beforeunload", e => {
  if (!S.project) return;
  saveNow(false);
  if (undownloaded()) { e.preventDefault(); e.returnValue = ""; }
});

/* ---------------- file .html e .zip ---------------- */
const indent = (s, pad) => s.split("\n").map(l => l ? pad + l : l).join("\n");
const libTags = (p, pad) => ({
  css: p.cssLibs.map(u => `${pad}<link rel="stylesheet" href="${esc(u)}">\n`).join(""),
  js: p.jsLibs.map(u => `${pad}<script src="${esc(u)}"><\/script>\n`).join("")
});
function singleHtml(p){
  const L = libTags(p, "  ");
  const src = JSON.stringify({ app: APP, v: 1, title: p.title, html: p.html, css: p.css, js: p.js, cssLibs: p.cssLibs, jsLibs: p.jsLibs }).replace(/</g, "\\u003c");
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
  <!-- Copia del codice per riaprire il progetto con EditorHTML_CSS_JS (Importa) -->
  <script type="application/json" id="editor-source">${src}<\/script>
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
function slug(s){ return (s || "progetto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "progetto"; }
function download(blob, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const dlHtml = p => download(new Blob([singleHtml(p)], { type: "text/html;charset=utf-8" }), slug(p.title) + ".html");
async function dlZip(p){
  const zip = new JSZip(); const dir = zip.folder(slug(p.title));
  dir.file("index.html", zipIndex(p)); dir.file("style.css", p.css); dir.file("script.js", p.js);
  dir.file("editor.json", JSON.stringify({ app: APP, version: 1, title: p.title, cssLibs: p.cssLibs, jsLibs: p.jsLibs }, null, 2));
  download(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), slug(p.title) + ".zip");
}
function markDownloaded(){ S.dlSig = sig(collect()); saveNow(false); }
async function dlBoth(){ const p = collect(); dlHtml(p); await new Promise(r => setTimeout(r, 500)); await dlZip(p); markDownloaded(); }
$("#exportBtn").onclick = () => openSheet("#exportSheet");
$("#dlBoth").onclick = async () => { await dlBoth(); closeSheets(); toast("Scaricati il file .html e il file .zip"); };
$("#dlHtml").onclick = () => { dlHtml(collect()); markDownloaded(); closeSheets(); toast("File .html scaricato"); };
$("#dlZip").onclick = async () => { await dlZip(collect()); markDownloaded(); closeSheets(); toast("File .zip scaricato"); };

/* ---------------- Nuovo e Importa (con conferma) ---------------- */
let pending = null;
function confirmReplace(action){
  pending = action;
  const unsaved = undownloaded();
  $("#confirmText").innerHTML = unsaved
    ? "<b>Non hai scaricato le ultime modifiche</b> di “" + esc(collect().title) + "”. Se continui, le perdi. Scaricale prima, oppure sostituisci comunque."
    : "Il progetto “" + esc(collect().title) + "” verrà chiuso. Lo hai già scaricato.";
  $("#confirmDl").hidden = !unsaved;
  openSheet("#confirmSheet");
  (unsaved ? $("#confirmDl") : $("#confirmGo")).focus();
}
$("#confirmDl").onclick = async () => {
  await dlBoth();
  $("#confirmText").innerHTML = "Scaricati il file .html e il file .zip. Ora puoi sostituire il progetto.";
  $("#confirmDl").hidden = true; $("#confirmGo").focus();
};
$("#confirmGo").onclick = () => { closeSheets(); const a = pending; pending = null; a && a(); };

$("#newBtn").onclick = () => confirmReplace(() => {
  load(normalize({ title: "Senza titolo" })); saveNow(false); ED.html.focus(); toast("Nuovo progetto");
});
$("#importBtn").onclick = () => confirmReplace(() => $("#fileInput").click());

function dedent(s){
  const lines = s.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
  const pads = lines.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length);
  const m = pads.length ? Math.min(...pads) : 0;
  return lines.map(l => l.slice(Math.min(m, l.match(/^[ \t]*/)[0].length))).join("\n");
}
function parseHtml(text){
  const m = text.match(/<script type="application\/json" id="editor-source">([\s\S]*?)<\/script>/);
  if (m) { try { const o = JSON.parse(m[1]); if (o && o.app === APP) return { title: o.title, html: o.html, css: [o.css], js: [o.js], cssLibs: o.cssLibs || [], jsLibs: o.jsLibs || [] }; } catch {} }
  const doc = new DOMParser().parseFromString(text, "text/html");
  const out = { title: (doc.title || "").trim(), css: [], js: [], cssLibs: [], jsLibs: [] };
  doc.querySelectorAll("style").forEach(s => { out.css.push(dedent(s.textContent)); s.remove(); });
  doc.querySelectorAll("link[rel~='stylesheet']").forEach(l => { const h = l.getAttribute("href") || ""; if (/^https?:\/\//i.test(h)) out.cssLibs.push(h); l.remove(); });
  doc.querySelectorAll("script").forEach(s => {
    const src = s.getAttribute("src");
    if (src) { if (/^https?:\/\//i.test(src)) out.jsLibs.push(src); }
    else if (!s.type || /javascript|module/i.test(s.type)) out.js.push(dedent(s.textContent));
    s.remove();
  });
  out.html = doc.body ? dedent(doc.body.innerHTML).replace(/\s+$/, "") : "";
  return out;
}
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
      const fh = pick(/\.html?$/i, "index\\.html"), fc = pick(/\.css$/i, "style\\.css"), fj = pick(/\.js$/i, "script\\.js"), fm = pick(/editor\.json$/i, "editor\\.json");
      if (!fh && !fc && !fj) { toast("Nello zip non ho trovato file .html, .css o .js."); return; }
      const r = fh ? parseHtml(await fh.async("string")) : { title: "", html: "", css: [], js: [], cssLibs: [], jsLibs: [] };
      let meta = null; try { meta = fm ? JSON.parse(await fm.async("string")) : null; } catch {}
      const css = [fc ? await fc.async("string") : "", ...r.css].filter(Boolean).join("\n\n");
      const js = [fj ? await fj.async("string") : "", ...r.js].filter(Boolean).join("\n\n");
      p = { title: (meta && meta.title) || r.title || f.name.replace(/\.zip$/i, ""), html: r.html, css, js,
            cssLibs: meta && Array.isArray(meta.cssLibs) ? meta.cssLibs : r.cssLibs, jsLibs: meta && Array.isArray(meta.jsLibs) ? meta.jsLibs : r.jsLibs };
    }
    load(normalize(p)); saveNow(false);
    toast("Aperto: " + S.project.title);
  } catch { toast("Non riesco a leggere questo file."); }
};

/* ---------------- librerie ---------------- */
$("#libsBtn").onclick = () => { $("#jsLibs").value = S.project.jsLibs.join("\n"); $("#cssLibs").value = S.project.cssLibs.join("\n"); openSheet("#libsSheet"); };
const urls = v => v.split(/\s+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s)).slice(0, 20);
$("#saveLibs").onclick = () => {
  S.project.jsLibs = urls($("#jsLibs").value); S.project.cssLibs = urls($("#cssLibs").value);
  closeSheets(); run(); saveNow(false); toast("Librerie applicate");
};

/* ---------------- avvio ----------------
   Il lavoro della sessione viene ripreso solo se la pagina è stata ricaricata (o si è tornati indietro
   da poco). Se la scheda o il browser sono stati chiusi e riaperti, si riparte dall'esempio. */
["html", "css", "js"].forEach(meta);
const nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
const saved = ss.get("session");
const age = saved ? Date.now() - (saved.at || 0) : Infinity;
const resume = saved && saved.p && ((nav.type === "reload" && age < 12 * 3600e3) || (nav.type === "back_forward" && age < 10 * 60e3));
if (resume) {
  load(normalize(saved.p), saved.dlSig || "");
  showSaved(saved.at);
} else {
  ss.del("session");
  load(normalize(STARTER));
  status("saved", "Pronto");
  saveNow(false);
}
if (!ss.ok) { status("error", "Salvataggio automatico non disponibile"); banner("<b>Questo browser non permette il salvataggio automatico.</b> Puoi lavorare, ma scarica spesso il progetto.", true); }
})();
