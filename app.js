"use strict";
const KEY = "gce_v1", LIM = 24 * 3600e3;
const pad = n => String(n).padStart(3, "0");
const INIT = Array.from({ length: 500 }, (_, i) => pad(i + 1));
const tk = () => Object.keys(db.drivers).sort((a, b) => +a - +b);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = ts => new Date(ts).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "short", timeStyle: "short" });
const dur = (a, b) => { const m = Math.round((b - a) / 6e4); return Math.floor(m / 60) + " h " + (m % 60) + " min"; };
const norm = s => { const n = parseInt(String(s).replace(/\D/g, ""), 10); return n >= 1 && n <= 99999 ? pad(n) : ""; };
const bkey = (n, c) => n.trim().toLowerCase() + "|" + c.trim().toLowerCase();
const isBici = v => /bici/i.test(v || "");
const NOTA_PH = "jefe, contratista, inspector, empresa…";

function initDb() {
  const drivers = {};
  INIT.forEach(t => drivers[t] = { nombre: "", vehiculo: "", placa: "", puesto: "", notas: "" });
  drivers["201"] = { nombre: "José Ángel Flores (ejemplo)", vehiculo: "Automóvil color negro", placa: "", puesto: "Labores domésticas", notas: "" };
  return { drivers, movs: [], bicis: [], biciNotas: {} };
}
let db;
try { const r = localStorage.getItem(KEY); db = r ? JSON.parse(r) : initDb(); } catch (e) { db = initDb(); }
if (!db.drivers) db.drivers = initDb().drivers; db.movs ||= []; db.bicis ||= []; db.biciNotas ||= {};
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert("No se pudo guardar en este dispositivo. Exporta a CSV."); } render(); }

// derivados
function accesos() {
  const all = [], open = {};
  db.movs.forEach(m => { if (m.tipo === "ENTRADA") { const a = { t: m.t, ent: m.ts, sal: null }; all.push(a); open[m.t] = a; } else if (open[m.t]) { open[m.t].sal = m.ts; open[m.t] = null; } });
  return all;
}
const dentro = t => { for (let i = db.movs.length - 1; i >= 0; i--) if (db.movs[i].t === t) return db.movs[i].tipo === "ENTRADA"; return false; };
const biciOpen = (n, c) => db.bicis.findIndex(b => bkey(b.nombre, b.color) === bkey(n, c) && b.sal === null);
const enCurso = ent => { const now = Date.now(); return now - ent > LIM ? `<span class="danger">ALERTA: ${dur(ent, now)} dentro</span>` : `<span class="ok">Dentro, ${dur(ent, now)}</span>`; };
const estadoHtml = d => d ? '<span class="ok">Dentro</span>' : '<span class="fuera">Fuera</span>';
const notaInput = (kind, id, val) => `<input class="nota" data-kind="${kind}" data-id="${esc(id)}" value="${esc(val)}" placeholder="${NOTA_PH}">`;
const histTable = rows => rows.length ? `<div class="tw"><table><tr><th>Hora de entrada (CDMX)</th><th>Hora de salida (CDMX)</th><th>Duración</th></tr>${rows.map(a => `<tr><td>${fmt(a.ent)}</td><td>${a.sal !== null ? fmt(a.sal) : enCurso(a.ent)}</td><td>${a.sal !== null ? dur(a.ent, a.sal) : "En curso"}</td></tr>`).join("")}</table></div>` : "<p>Sin accesos registrados.</p>";

function fichaTicket(t, editable) {
  const d = db.drivers[t];
  const h = accesos().filter(a => a.t === t).reverse();
  let html = `<dl class="props">
    <dt>Número de ticket</dt><dd>${t}</dd>
    <dt>Nombre del empleado</dt><dd>${esc(d.nombre) || "Sin registrar"}</dd>
    <dt>Tipo de vehículo y color</dt><dd>${esc(d.vehiculo) || "Sin registrar"}</dd>
    <dt>Placa</dt><dd>${esc((d.placa || "").toUpperCase()) || "Sin registrar"}</dd>
    <dt>Puesto o labor</dt><dd>${esc(d.puesto) || "Sin registrar"}</dd>
    <dt>Notas</dt><dd>${notaInput("t", t, d.notas)}</dd>
    <dt>Estado</dt><dd>${estadoHtml(dentro(t))}</dd></dl>`;
  if (editable) html += `<h3>Editar datos del conductor</h3><div class="row">
    <label>Número de ticket<input id="fTicket" value="${t}" inputmode="numeric" style="width:110px"></label>
    <label>Nombre del empleado<input id="fNombre" value="${esc(d.nombre)}"></label>
    <label>Tipo de vehículo y color<input id="fVeh" value="${esc(d.vehiculo)}" placeholder="Ej. Bicicleta roja"></label>
    <label>Placa (obligatoria)<input id="fPlaca" value="${esc((d.placa || "").toUpperCase())}" style="text-transform:uppercase"></label>
    <label>Puesto o labor<input id="fPuesto" value="${esc(d.puesto)}"></label>
    <button id="fSave" class="ent" data-t="${t}">Guardar datos</button><button id="fDel" class="sal" data-t="${t}">Borrar del padrón</button></div>
    <div id="fErr" class="danger" style="margin-top:6px" hidden>La placa es obligatoria</div>`;
  return html + histTable(h);
}

let gSel = "", filtro = "todos";
function render() {
  const acc = accesos(), now = Date.now();
  const tDentro = tk().filter(dentro).length, bDentro = db.bicis.filter(b => b.sal === null);
  $("cDentro").innerHTML = `<div class="l">Vehículos dentro ahora</div><div class="n" id="nDentro">${tDentro + bDentro.length}</div><div class="d">Con ticket: ${tDentro} · Ciclistas sin ticket: ${bDentro.length}</div>`;
  const s = new Set(); db.bicis.forEach(b => s.add("b:" + bkey(b.nombre, b.color)));
  let ent = db.bicis.length, sal = db.bicis.filter(b => b.sal !== null).length;
  acc.forEach(a => { if (isBici(db.drivers[a.t].vehiculo)) { s.add("t:" + a.t); ent++; if (a.sal !== null) sal++; } });
  $("cBici").innerHTML = `<div class="l">Ciclistas que han entrado (total acumulado)</div><div class="n" id="nBici">${s.size}</div><div class="d">Entradas: ${ent} · Salidas: ${sal}</div>`;

  const al = [...acc.filter(a => a.sal === null && now - a.ent > LIM).map(a => ({ q: "Ticket " + a.t + (db.drivers[a.t].nombre ? " · " + db.drivers[a.t].nombre : ""), ent: a.ent })),
    ...bDentro.filter(b => now - b.ent > LIM).map(b => ({ q: "Ciclista " + b.nombre + " (" + b.color + ")", ent: b.ent }))].sort((x, y) => x.ent - y.ent);
  $("alertas").hidden = !al.length;
  $("alertas").innerHTML = al.length ? `<h2>Alertas: ${al.length} ${al.length === 1 ? "acceso lleva" : "accesos llevan"} más de 24 horas sin salida</h2><div class="tw"><table><tr><th>Ticket / nombre</th><th>Hora de entrada (CDMX)</th><th>Tiempo dentro</th></tr>${al.map(x => `<tr><td>${esc(x.q)}</td><td>${fmt(x.ent)}</td><td><span class="danger">${dur(x.ent, now)}</span></td></tr>`).join("")}</table></div>` : "";

  // buscador global
  const gn = $("gq").value.trim().toLowerCase(), res = [];
  if (gn) {
    if (/^\d+$/.test(gn)) { const t = norm(gn); if (t && db.drivers[t]) res.push(["t:" + t, "Ticket " + t, db.drivers[t]]); }
    else {
      tk().forEach(t => { const d = db.drivers[t]; if ((d.nombre + " " + d.notas + " " + d.placa).toLowerCase().includes(gn)) res.push(["t:" + t, "Ticket " + t, d]); });
      const seen = new Set(); db.bicis.forEach(b => { const k = bkey(b.nombre, b.color); const n = db.biciNotas[k] || ""; if (!seen.has(k) && (b.nombre + " " + n).toLowerCase().includes(gn)) { seen.add(k); res.push(["b:" + k, "Ciclista", { nombre: b.nombre, vehiculo: "bici " + b.color, notas: n }]); } });
    }
  }
  $("gres").innerHTML = gSel ? "" : res.slice(0, 20).map(([id, l, d]) => `<button class="res" data-sel="${esc(id)}">${esc(l)}${d.nombre ? " · " + esc(d.nombre) : ""}${d.vehiculo ? " · " + esc(d.vehiculo) : ""}${d.notas ? " · Notas: " + esc(d.notas) : ""}</button>`).join("") || (gn ? "<p>Sin coincidencias.</p>" : "");
  if (gSel.startsWith("t:")) $("gsel").innerHTML = fichaTicket(gSel.slice(2), false);
  else if (gSel.startsWith("b:")) {
    const k = gSel.slice(2), bs = db.bicis.filter(b => bkey(b.nombre, b.color) === k).reverse();
    $("gsel").innerHTML = bs.length ? `<dl class="props"><dt>Ciclista (sin ticket)</dt><dd>${esc(bs[0].nombre)}</dd><dt>Color de la bicicleta</dt><dd>${esc(bs[0].color)}</dd><dt>Notas</dt><dd>${notaInput("b", k, db.biciNotas[k] || "")}</dd><dt>Estado</dt><dd>${estadoHtml(bs.some(b => b.sal === null))}</dd></dl>` + histTable(bs) : "";
  } else $("gsel").innerHTML = "";

  // registro por ticket
  const t = curTicket();
  $("tEnt").disabled = !t || dentro(t); $("tSal").disabled = !t || !dentro(t);
  if (!document.activeElement || !$("tficha").contains(document.activeElement)) $("tficha").innerHTML = t ? fichaTicket(t, true) : "";
  validarPlaca();

  // ciclistas dentro
  $("bdentro").innerHTML = bDentro.length ? `<table><tr><th>Dentro ahora</th><th>Color</th><th>Hora de entrada (CDMX)</th><th>Tiempo dentro</th><th>Notas</th></tr>${bDentro.map(b => { const k = bkey(b.nombre, b.color); return `<tr><td>${esc(b.nombre)}</td><td>${esc(b.color)}</td><td>${fmt(b.ent)}</td><td>${enCurso(b.ent)}</td><td>${notaInput("b", k, db.biciNotas[k] || "")}</td></tr>`; }).join("")}</table>` : "";

  // lista
  const nReg = tk().filter(t => db.drivers[t].nombre.trim()).length;
  $("seg").innerHTML = [["todos", "Todos"], ["dentro", "Dentro (" + tDentro + ")"], ["fuera", "Fuera"], ["sindatos", "Sin datos (" + (tk().length - nReg) + ")"]].map(([v, l]) => `<button data-f="${v}" class="${filtro === v ? "on" : ""}">${l}</button>`).join("");
  const lq = $("lq").value.trim().toLowerCase();
  const lista = tk().filter(t => { const d = db.drivers[t], dn = dentro(t);
    if (filtro === "dentro" && !dn) return false; if (filtro === "fuera" && dn) return false; if (filtro === "sindatos" && d.nombre.trim()) return false;
    return !lq || (t + " " + d.nombre + " " + d.vehiculo + " " + d.placa + " " + d.puesto + " " + d.notas).toLowerCase().includes(lq); });
  if (!$("lista").contains(document.activeElement)) $("lista").innerHTML = `<table><tr><th>Ticket</th><th>Nombre del empleado</th><th>Vehículo y color</th><th>Placa</th><th>Puesto o labor</th><th>Estado</th><th>Notas</th></tr>${lista.slice(0, 100).map(t => { const d = db.drivers[t]; return `<tr><td>${t}</td><td>${esc(d.nombre) || "—"}</td><td>${esc(d.vehiculo) || "—"}</td><td>${esc((d.placa || "").toUpperCase()) || "—"}</td><td>${esc(d.puesto) || "—"}</td><td>${estadoHtml(dentro(t))}</td><td>${notaInput("t", t, d.notas)}</td></tr>`; }).join("")}</table><p>Mostrando ${Math.min(lista.length, 100)} de ${lista.length} tickets.</p>`;
}
function curTicket() {
  const q = $("tq").value.trim().toLowerCase(); if (!q) return "";
  if (/^\d+$/.test(q)) { const t = norm(q); return db.drivers[t] ? t : ""; }
  return q.length >= 2 ? (tk().find(t => db.drivers[t].nombre.toLowerCase().includes(q)) || "") : "";
}
function validarPlaca() {
  const p = $("fPlaca"); if (!p) return;
  const vacia = p.value.trim() === "";
  $("fSave").disabled = vacia; $("fErr").hidden = !vacia;
}
const msg = (id, t) => { $(id).innerHTML = t ? `<div class="msg">${esc(t)}</div>` : ""; };

// eventos
document.addEventListener("input", e => {
  const el = e.target;
  if (el.classList.contains("nota")) {
    if (el.dataset.kind === "t") db.drivers[el.dataset.id].notas = el.value; else db.biciNotas[el.dataset.id] = el.value;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (x) {}
    return;
  }
  if (el.id === "aPlaca") { const pos = el.selectionStart; el.value = el.value.toUpperCase(); el.setSelectionRange(pos, pos); }
  if (el.id.startsWith("a")) { const v = $("aPlaca").value.trim() === ""; $("aAdd").disabled = v; $("aErr").hidden = !v; }
  if (el.id === "fPlaca") { const pos = el.selectionStart; el.value = el.value.toUpperCase(); el.setSelectionRange(pos, pos); validarPlaca(); return; }
  if (el.id === "gq") gSel = "";
  if (el.id === "tq") { msg("tmsg", ""); $("tficha").innerHTML = ""; }
  if (["gq", "tq", "lq"].includes(el.id)) render();
});
document.addEventListener("focusout", e => { if (e.target.classList && e.target.classList.contains("nota")) setTimeout(render, 0); });
document.addEventListener("click", e => {
  const el = e.target.closest("button"); if (!el) return;
  if (el.dataset.sel) { gSel = el.dataset.sel; render(); return; }
  if (el.dataset.f) { filtro = el.dataset.f; render(); return; }
  const t = curTicket();
  switch (el.id) {
    case "tEnt": case "tSal": {
      const tipo = el.id === "tEnt" ? "ENTRADA" : "SALIDA";
      if (!t) return msg("tmsg", "Escribe un ticket del padrón o un nombre registrado.");
      if (tipo === "ENTRADA" && dentro(t)) return msg("tmsg", "El ticket " + t + " ya está dentro: registra su salida primero.");
      if (tipo === "SALIDA" && !dentro(t)) return msg("tmsg", "El ticket " + t + " no tiene una entrada abierta.");
      const ts = Date.now(); db.movs.push({ t, tipo, ts }); $("tficha").innerHTML = ""; save();
      msg("tmsg", tipo + " registrada para el ticket " + t + " · " + fmt(ts) + " (CDMX)"); break;
    }
    case "fSave": {
      const tt = el.dataset.t, placa = $("fPlaca").value.trim().toUpperCase();
      if (!placa) { validarPlaca(); return; }
      const nt = norm($("fTicket").value);
      if (!nt) return msg("tmsg", "Número de ticket inválido.");
      if (nt !== tt && db.drivers[nt]) return msg("tmsg", "El ticket " + nt + " ya existe en el padrón.");
      const datos = Object.assign({}, db.drivers[tt], { nombre: $("fNombre").value.trim(), vehiculo: $("fVeh").value.trim(), placa, puesto: $("fPuesto").value.trim() });
      if (nt !== tt) { delete db.drivers[tt]; db.movs.forEach(m => { if (m.t === tt) m.t = nt; }); $("tq").value = nt; }
      db.drivers[nt] = datos;
      $("tficha").innerHTML = ""; save(); msg("tmsg", "Datos del ticket " + nt + " guardados" + (nt !== tt ? " (antes " + tt + ")." : ".")); break;
    }
    case "fDel": {
      const tt = el.dataset.t;
      if (!confirm("¿Borrar el ticket " + tt + " del padrón y su historial?")) return;
      delete db.drivers[tt]; db.movs = db.movs.filter(m => m.t !== tt);
      $("tq").value = ""; $("tficha").innerHTML = ""; save(); msg("tmsg", "Ticket " + tt + " borrado del padrón."); break;
    }
    case "aAdd": {
      const nt = norm($("aTicket").value), placa = $("aPlaca").value.trim().toUpperCase();
      if (!nt) return msg("amsg", "Escribe un número de ticket válido.");
      if (db.drivers[nt]) return msg("amsg", "El ticket " + nt + " ya existe; búscalo para editarlo.");
      if (!placa) return msg("amsg", "La placa es obligatoria");
      db.drivers[nt] = { nombre: $("aNombre").value.trim(), vehiculo: $("aVeh").value.trim(), placa, puesto: $("aPuesto").value.trim(), notas: "" };
      ["aTicket", "aNombre", "aVeh", "aPlaca", "aPuesto"].forEach(i => $(i).value = "");
      save(); msg("amsg", "Ticket " + nt + " agregado al padrón."); break;
    }
    case "bEnt": case "bSal": {
      const n = $("bn").value.trim(), c = $("bc").value.trim();
      if (!n || !c) return msg("bmsg", "Escribe nombre y color de la bicicleta.");
      const i = biciOpen(n, c), ts = Date.now();
      if (el.id === "bEnt") { if (i >= 0) return msg("bmsg", n + " ya está dentro: registra su salida primero."); db.bicis.push({ nombre: n, color: c, ent: ts, sal: null }); save(); msg("bmsg", "ENTRADA de " + n + " · " + fmt(ts) + " (CDMX)"); }
      else { if (i < 0) return msg("bmsg", "No hay una entrada abierta para " + n + " con bicicleta " + c + "."); db.bicis[i].sal = ts; save(); msg("bmsg", "SALIDA de " + n + " · " + fmt(ts) + " (CDMX)"); }
      break;
    }
    case "imp": importar($("csvIn").value); break;
    case "expC": download("conductores.csv", ["ticket,nombre,vehiculo_color,placa,puesto,notas", ...tk().map(t => { const d = db.drivers[t]; return [t, d.nombre, d.vehiculo, (d.placa || "").toUpperCase(), d.puesto, d.notas].map(csvCell).join(","); })]); break;
    case "expA": download("accesos.csv", ["ticket,nombre,hora_entrada_cdmx,hora_salida_cdmx,duracion", ...accesos().map(a => [a.t, db.drivers[a.t].nombre, fmt(a.ent), a.sal !== null ? fmt(a.sal) : "", a.sal !== null ? dur(a.ent, a.sal) : "En curso"].map(csvCell).join(","))]); break;
    case "expB": download("ciclistas.csv", ["nombre,color_bicicleta,hora_entrada_cdmx,hora_salida_cdmx,duracion,notas", ...db.bicis.map(b => [b.nombre, b.color, fmt(b.ent), b.sal !== null ? fmt(b.sal) : "", b.sal !== null ? dur(b.ent, b.sal) : "En curso", db.biciNotas[bkey(b.nombre, b.color)] || ""].map(csvCell).join(","))]); break;
  }
});
$("csvFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) f.text().then(importar); });

function csvCell(s) { s = String(s ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function parseLine(line) { const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === "," || c === ";") { out.push(cur); cur = ""; } else cur += c; }
  out.push(cur); return out.map(x => x.trim()); }
function importar(text) {
  let ok = 0, sinPlaca = 0;
  text.split(/\r?\n/).forEach(l => { if (!l.trim()) return; const c = parseLine(l); const t = norm(c[0] || ""); if (!t) return;
    const placa = (c[3] || "").toUpperCase(); if (!placa) { sinPlaca++; return; }
    db.drivers[t] = { nombre: c[1] || "", vehiculo: c[2] || "", placa, puesto: c[4] || "", notas: c[5] || "" }; ok++; });
  save(); $("csvIn").value = "";
  $("csvmsg").innerHTML = `<div class="msg">${ok} conductores importados.</div>` + (sinPlaca ? `<div class="danger">${sinPlaca} filas omitidas: la placa es obligatoria.</div>` : "");
}
function download(name, lines) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

// título editable
const TKEY = "gce_titulo", TDEF = "Grok Control Estacionamiento";
function getTitulo() { try { return localStorage.getItem(TKEY) || TDEF; } catch (e) { return TDEF; } }
function pintaTitulo() { const t = getTitulo(); $("titulo").textContent = t; document.title = t;
  $("tEdit").innerHTML = '<button id="tPen" title="Editar título">✏️ Editar título</button>'; }
function editaTitulo() {
  $("tEdit").innerHTML = `<input id="tIn" value="${esc(getTitulo())}" aria-label="Título"><button id="tOk" class="ent">Guardar</button><button id="tDef">Restaurar predeterminado</button><button id="tCancel">Cancelar</button>`;
  $("tIn").focus();
}
document.addEventListener("click", e => { const el = e.target.closest("button"); if (!el) return;
  if (el.id === "tPen") editaTitulo();
  else if (el.id === "tOk") { const v = $("tIn").value.trim(); try { v ? localStorage.setItem(TKEY, v) : localStorage.removeItem(TKEY); } catch (x) {} pintaTitulo(); }
  else if (el.id === "tDef") { try { localStorage.removeItem(TKEY); } catch (x) {} pintaTitulo(); }
  else if (el.id === "tCancel") pintaTitulo();
  else if (el.id === "expX") exportXlsx();
});
document.addEventListener("keydown", e => { if (e.target.id === "tIn" && e.key === "Enter") $("tOk").click(); });
pintaTitulo();

function exportXlsx() {
  if (typeof XLSX === "undefined") return alert("No se pudo cargar el generador de Excel.");
  const wb = XLSX.utils.book_new(), add = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  add([["Ticket", "Nombre", "Placa", "Vehículo y color", "Puesto o labor", "Notas", "Estado"],
    ...tk().map(t => { const d = db.drivers[t]; return [t, d.nombre, (d.placa || "").toUpperCase(), d.vehiculo, d.puesto, d.notas || "", dentro(t) ? "Dentro" : "Fuera"]; })], "Padrón");
  add([["Ticket", "Nombre", "Placa", "Hora de entrada (CDMX)", "Hora de salida (CDMX)", "Duración"],
    ...accesos().map(a => { const d = db.drivers[a.t] || {}; return [a.t, d.nombre || "", (d.placa || "").toUpperCase(), fmt(a.ent), a.sal !== null ? fmt(a.sal) : "", a.sal !== null ? dur(a.ent, a.sal) : "En curso"]; })], "Accesos");
  const seen = new Map(); db.bicis.forEach(b => { const k = bkey(b.nombre, b.color); if (!seen.has(k)) seen.set(k, [b.nombre, b.color, db.biciNotas[k] || ""]); });
  add([["Nombre", "Color de la bicicleta", "Notas"], ...seen.values()], "Ciclistas");
  add([["Nombre", "Color", "Hora de entrada (CDMX)", "Hora de salida (CDMX)", "Duración"],
    ...db.bicis.map(b => [b.nombre, b.color, fmt(b.ent), b.sal !== null ? fmt(b.sal) : "", b.sal !== null ? dur(b.ent, b.sal) : "En curso"])], "Accesos ciclistas");
  const f = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  XLSX.writeFile(wb, "control-estacionamiento-" + f + ".xlsx");
}

setInterval(render, 60000);
render();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(r => { window.__swOk = true; }).catch(e => { window.__swErr = String(e); });
