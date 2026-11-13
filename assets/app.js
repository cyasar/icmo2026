/* KDYM etkileşimli sunum — arayüz katmanı */
(function () {
  "use strict";
  const K = window.KDYM;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const nf = (d) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const f2 = (x) => nf(2).format(x), f3 = (x) => nf(3).format(x), pc = (x, d = 0) => "%" + nf(d).format(x * 100);

  const GEN_COL = ["--s1", "--s2", "--s3", "--s4"].map(css);
  const SC_COL = ["--s1", "--s2", "--s3", "--s4", "--s5"].map(css);
  const INK2 = css("--ink-2"), LINE = css("--line"), NAVY = css("--navy");

  /* ------------------------- durum ------------------------- */
  const S = {
    p: K.defaultParams(),
    A: K.defaultAHP(),
    ahp: null,
    strat: { raw: K.SCENARIOS[4].L.slice(), u: K.SCENARIOS[4].u },
    opt: null, mc: null, val: null, ver: 0, gamma: 2, pct: 0.2
  };
  S.ahp = K.ahp(S.A);
  const charts = {};

  function invalidate() {
    S.ver++; S.opt = null; S.mc = null; S.val = null;
    refreshCurrent();
  }

  /* ------------------ arka plan işleri (Worker) ------------------ */
  let worker = null, jobId = 0; const pending = {};
  try {
    worker = new Worker("assets/worker.js?v=20261114a");
    worker.onmessage = (e) => { const cb = pending[e.data.id]; if (cb) { delete pending[e.data.id]; cb(e.data); } };
    worker.onerror = () => { worker = null; Object.keys(pending).forEach((id) => { const j = pending[id]; delete pending[id]; j.fallback(); }); };
  } catch (e) { worker = null; }

  function localJob(m) {
    if (m.cmd === "opt") {
      const o = K.optimizeUniform(m.p, { N: m.N || 900, gamma: m.gamma });
      const pe = K.optimizePersonal(m.p, o.best, { gamma: m.gamma });
      return { pts: o.pts.map((q) => ({ x: q.E, y: q.Pavg })), pareto: o.pareto.map((q) => ({ x: q.E, y: q.Pavg })), best: o.best,
        personal: { L: pe.strat.L, u: pe.strat.u, Pavg: pe.res.Pavg, E: pe.res.E, J: pe.J } };
    }
    if (m.cmd === "mc") return { mc: K.monteCarlo(m.p, m.w, { N: m.N || 300, pct: m.pct }), tor: K.tornado(m.p, K.SCENARIOS[4], m.pct) };
    if (m.cmd === "val") return K.validationSuite(m.p, m.ahp);
  }
  function job(m) {
    return new Promise((resolve, reject) => {
      const runLocal = () => setTimeout(() => { try { resolve(localJob(m)); } catch (err) { reject(err); } }, 30);
      if (!worker) return runLocal();
      const id = ++jobId; m.id = id;
      pending[id] = (d) => (d.ok ? resolve(d.data) : reject(d.error));
      pending[id].fallback = runLocal;
      try { worker.postMessage(m); } catch (e) { delete pending[id]; runLocal(); }
    });
  }

  /* ------------------------- Chart.js ------------------------- */
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 13;
  Chart.defaults.color = INK2;
  Chart.defaults.borderColor = LINE;
  Chart.defaults.animation.duration = 300;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.boxHeight = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = "#1d2233";
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.locale = "tr-TR";

  function lineOpts(yLabel, yMin, yMax) {
    return {
      responsive: true, interaction: { mode: "index", intersect: false },
      elements: { point: { radius: 0, hoverRadius: 5 }, line: { borderWidth: 2, tension: 0.25 } },
      scales: {
        x: { type: "linear", title: { display: true, text: "Zaman (ay)" }, grid: { display: false }, ticks: { stepSize: 6 } },
        y: { title: { display: !!yLabel, text: yLabel }, min: yMin, max: yMax, ticks: { callback: (v) => f2(v) } }
      },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => "t = " + nf(1).format(it[0].parsed.x) + " ay", label: (c) => c.dataset.label + ": " + f3(c.parsed.y) } } }
    };
  }
  const xy = (t, arr) => t.map((ti, i) => ({ x: ti, y: arr[i] }));

  /* ------------------------- yardımcılar ------------------------- */
  const norm = (a) => { const s = a.reduce((x, y) => x + y, 0) || 1; return a.map((v) => v / s); };
  const curStrat = () => K.uniform(norm(S.strat.raw), S.strat.u);
  const mixStr = (L) => L.map((v) => Math.round(v * 100)).join("/");

  /* ===================== Slayt 8: parametre tablosu ===================== */
  function renderParamTable() {
    const t = $("#paramTable");
    let h = "<thead><tr><th>Kuşak</th>" + K.STYLE_SHORT.map((s) => `<th title="${K.STYLES[K.STYLE_SHORT.indexOf(s)]} uyumu">β·${s}</th>`).join("") +
      "<th title='Dijital kanal tercihi'>δ</th><th title='İşgücü payı'>w</th></tr></thead><tbody>";
    K.GENS.forEach((g, gi) => {
      h += `<tr><td><span class="swatch" style="background:${GEN_COL[gi]}"></span>${g}</td>`;
      S.p.beta[g].forEach((b, k) => (h += `<td><input type="number" min="0" max="1" step="0.05" data-g="${g}" data-k="${k}" value="${b}"></td>`));
      h += `<td><input type="number" min="0" max="1" step="0.05" data-g="${g}" data-d="1" value="${S.p.delta[g]}"></td>`;
      h += `<td><input type="number" min="0" max="1" step="0.05" data-g="${g}" data-w="1" value="${S.p.w[g]}"></td></tr>`;
    });
    h += "</tbody>";
    t.innerHTML = h;
    $$("input", t).forEach((inp) => inp.addEventListener("change", () => {
      let v = parseFloat(inp.value); if (!isFinite(v)) v = 0; v = Math.max(0, Math.min(1, v)); inp.value = v;
      const g = inp.dataset.g;
      if (inp.dataset.d) S.p.delta[g] = v; else if (inp.dataset.w) S.p.w[g] = v; else S.p.beta[g][+inp.dataset.k] = v;
      syncWSliders(); invalidate();
    }));
  }
  $("#resetParams").addEventListener("click", () => { S.p = K.defaultParams(); renderParamTable(); syncWSliders(); invalidate(); });

  /* ===================== Slayt 9: canlı simülasyon ===================== */
  function buildSimControls() {
    $("#Lctrls").innerHTML = K.STYLES.map((s, k) =>
      `<div class="ctrl"><label>${s} <output id="Lo${k}"></output></label><input type="range" min="0" max="1" step="0.01" id="Li${k}"></div>`).join("");
    $("#Wctrls").innerHTML = K.GENS.map((g, i) =>
      `<div class="ctrl"><label><span><span class="swatch" style="background:${GEN_COL[i]}"></span>${g}</span> <output id="Wo${i}"></output></label><input type="range" min="0" max="1" step="0.01" id="Wi${i}"></div>`).join("");
    $("#presetRow").innerHTML = K.SCENARIOS.map((s, i) => `<button class="btn ghost preset" data-i="${i}">${s.id} ${s.ad}</button>`).join("");
    K.STYLES.forEach((s, k) => $("#Li" + k).addEventListener("input", (e) => { S.strat.raw[k] = +e.target.value; updateSim(); }));
    K.GENS.forEach((g, i) => $("#Wi" + i).addEventListener("input", (e) => { S.p.w[g] = +e.target.value; renderParamTable(); S.ver++; S.opt = S.mc = S.val = null; updateSim(); }));
    $("#uIn").addEventListener("input", (e) => { S.strat.u = +e.target.value; updateSim(); });
    $$("#presetRow button").forEach((b) => b.addEventListener("click", () => {
      const sc = K.SCENARIOS[+b.dataset.i]; S.strat.raw = sc.L.slice(); S.strat.u = sc.u; syncSimSliders(); updateSim();
    }));
    syncSimSliders(); syncWSliders();
  }
  function syncSimSliders() { K.STYLES.forEach((s, k) => ($("#Li" + k).value = S.strat.raw[k])); $("#uIn").value = S.strat.u; }
  function syncWSliders() {
    const tot = K.GENS.reduce((a, g) => a + S.p.w[g], 0) || 1;
    K.GENS.forEach((g, i) => { const el = $("#Wi" + i); if (el) { el.value = S.p.w[g]; $("#Wo" + i).textContent = pc(S.p.w[g] / tot); } });
  }

  function updateSim() {
    const st = curStrat(), L = st.L.Y;
    K.STYLES.forEach((s, k) => ($("#Lo" + k).textContent = pc(L[k])));
    $("#uOut").textContent = pc(S.strat.u); syncWSliders();
    const r = K.simulate(S.p, st, true), tr = r.trace;
    $("#kP").textContent = f3(r.Pavg); $("#kE").textContent = f3(r.E); $("#kV").textContent = f3(r.V); $("#kK").textContent = f3(r.K);
    const dsM = K.GENS.map((g, i) => ({ label: g, data: xy(tr.t, tr.M[i]), borderColor: GEN_COL[i], backgroundColor: GEN_COL[i], hidden: S.p.w[g] <= 0 }));
    const Ibar = tr.t.map((_, j) => { const w = K.GENS.map((g) => S.p.w[g]); const s = w.reduce((a, b) => a + b, 0) || 1; return K.GENS.reduce((a, g, i) => a + (w[i] / s) * tr.I[i][j], 0); });
    const dsO = [
      { label: "Performans P", data: xy(tr.t, tr.P), borderColor: NAVY, backgroundColor: NAVY, borderWidth: 3 },
      { label: "Yenilik K", data: xy(tr.t, tr.K), borderColor: SC_COL[2], backgroundColor: SC_COL[2] },
      { label: "Karar hızı V", data: xy(tr.t, tr.V), borderColor: SC_COL[1], backgroundColor: SC_COL[1] },
      { label: "İletişim Ī", data: xy(tr.t, Ibar), borderColor: SC_COL[4], backgroundColor: SC_COL[4], borderDash: [6, 4] }
    ];
    if (!charts.M) {
      charts.M = new Chart($("#chM"), { type: "line", data: { datasets: dsM }, options: lineOpts("Motivasyon", 0.4, 0.8) });
      charts.O = new Chart($("#chOrg"), { type: "line", data: { datasets: dsO }, options: lineOpts("Düzey", 0.2, 0.9) });
    } else {
      charts.M.data.datasets.forEach((d, i) => { d.data = dsM[i].data; d.hidden = dsM[i].hidden; });
      charts.O.data.datasets.forEach((d, i) => (d.data = dsO[i].data));
      charts.M.update(); charts.O.update();
    }
  }

  /* ===================== Slayt 10: senaryolar ===================== */
  function evalScen() { return K.evaluateScenarios(S.p, S.ahp.w); }
  function renderScenarios() {
    const ev = evalScen();
    const best = ev.res.reduce((b, r, i) => (r.Pavg > ev.res[b].Pavg ? i : b), 0);
    let h = "<thead><tr><th>Senaryo</th><th>ℓ (D/E/K/Dj)</th><th>u</th>" + K.CRITERIA.map((c) => `<th>${c.ad.split(" ")[0]}</th>`).join("") + "</tr></thead><tbody>";
    K.SCENARIOS.forEach((s, i) => {
      const colMax = K.CRITERIA.map((c) => Math.max(...ev.res.map((r) => r[c.k])));
      h += `<tr${i === best ? ' class="best"' : ""}><td><span class="swatch" style="background:${SC_COL[i]}"></span>${s.id} ${s.ad}</td><td>${mixStr(s.L)}</td><td>${f2(s.u)}</td>` +
        K.CRITERIA.map((c, j) => { const v = ev.res[i][c.k]; return `<td${v === colMax[j] ? ' style="font-weight:800;color:var(--navy)"' : ""}>${f3(v)}</td>`; }).join("") + "</tr>";
    });
    $("#scenTable").innerHTML = h + "</tbody>";
    const ds = K.SCENARIOS.map((s, i) => { const r = K.simulate(S.p, K.uniform(s.L, s.u), true); return { label: s.id + " " + s.ad, data: xy(r.trace.t, r.trace.P), borderColor: SC_COL[i], backgroundColor: SC_COL[i] }; });
    if (!charts.scen) charts.scen = new Chart($("#chScen"), { type: "line", data: { datasets: ds }, options: lineOpts("Performans P(t)") });
    else { charts.scen.data.datasets.forEach((d, i) => (d.data = ds[i].data)); charts.scen.update(); }
  }

  /* ===================== Slayt 11: AHP ===================== */
  const SAATY = [1 / 9, 1 / 7, 1 / 5, 1 / 3, 1 / 2, 1, 2, 3, 5, 7, 9];
  const saatyLbl = (v) => (v >= 1 ? String(Math.round(v)) : "1/" + Math.round(1 / v));
  const CR_SHORT = ["P̄", "M̄", "Ī", "V", "K", "E"];
  function renderAHP() {
    const n = S.A.length;
    let h = "<thead><tr><th></th>" + CR_SHORT.map((c, j) => `<th title="${K.CRITERIA[j].ad}">${c}</th>`).join("") + "</tr></thead><tbody>";
    for (let i = 0; i < n; i++) {
      h += `<tr><td>${K.CRITERIA[i].ad}</td>`;
      for (let j = 0; j < n; j++) {
        if (i === j) h += '<td class="diag">1</td>';
        else if (j > i) h += `<td><select data-i="${i}" data-j="${j}">` + SAATY.map((v) => `<option value="${v}"${Math.abs(v - S.A[i][j]) < 1e-9 ? " selected" : ""}>${saatyLbl(v)}</option>`).join("") + "</select></td>";
        else h += `<td class="recip">${saatyLbl(S.A[i][j])}</td>`;
      }
      h += "</tr>";
    }
    $("#ahpTable").innerHTML = h + "</tbody>";
    $$("#ahpTable select").forEach((sel) => sel.addEventListener("change", () => {
      const i = +sel.dataset.i, j = +sel.dataset.j, v = +sel.value;
      S.A[i][j] = v; S.A[j][i] = 1 / v; S.ahp = K.ahp(S.A); renderAHP(); S.ver++; S.opt = S.mc = S.val = null;
    }));
    const a = S.ahp;
    const ok = a.CR < 0.1;
    $("#crBox").innerHTML = `<h3>Tutarlılık <span class="pill ${ok ? "good" : "bad"}">${ok ? "✓ kabul" : "✗ revize edin"}</span></h3>
      <p class="small">λ<sub>max</sub> = ${f3(a.lmax)} · CI = ${f3(a.CI)} · <strong>CR = ${f3(a.CR)}</strong> (eşik 0,10; RI<sub>6</sub> = 1,24)</p>`;
    const data = { labels: K.CRITERIA.map((c) => c.ad), datasets: [{ label: "Ağırlık", data: a.w, backgroundColor: NAVY, borderRadius: 4, barPercentage: 0.7 }] };
    const opts = { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => pc(c.parsed.x, 1) } } },
      scales: { x: { min: 0, ticks: { callback: (v) => pc(v) } }, y: { grid: { display: false } } } };
    if (!charts.w) charts.w = new Chart($("#chW"), { type: "bar", data, options: opts });
    else { charts.w.data.datasets[0].data = a.w; charts.w.update(); }
  }

  /* ===================== Slayt 12: TOPSIS ===================== */
  function renderTOPSIS() {
    const ev = evalScen(), t = ev.topsis;
    let h = "<thead><tr><th>Sıra</th><th>Senaryo</th><th>C*</th></tr></thead><tbody>";
    t.order.forEach((i, r) => (h += `<tr${r === 0 ? ' class="best"' : ""}><td>${r + 1}</td><td><span class="swatch" style="background:${SC_COL[i]}"></span>${K.SCENARIOS[i].id} ${K.SCENARIOS[i].ad}</td><td>${f3(t.C[i])}</td></tr>`));
    $("#topsisTable").innerHTML = h + "</tbody>";
    const labels = t.order.map((i) => K.SCENARIOS[i].id + " " + K.SCENARIOS[i].ad);
    const data = t.order.map((i) => t.C[i]), cols = t.order.map((i) => SC_COL[i]);
    const opts = { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => "C* = " + f3(c.parsed.x) } } },
      scales: { x: { min: 0, max: 1, ticks: { callback: (v) => f2(v) } }, y: { grid: { display: false } } } };
    if (!charts.top) charts.top = new Chart($("#chTopsis"), { type: "bar", data: { labels, datasets: [{ data, backgroundColor: cols, borderRadius: 4, barPercentage: 0.7 }] }, options: opts });
    else { charts.top.data.labels = labels; charts.top.data.datasets[0].data = data; charts.top.data.datasets[0].backgroundColor = cols; charts.top.update(); }
  }

  /* ===================== Slayt 13: optimizasyon ===================== */
  $("#gIn").addEventListener("input", (e) => { S.gamma = +e.target.value; $("#gOut").textContent = nf(1).format(S.gamma); });
  $("#gIn").addEventListener("change", () => { S.opt = null; runOpt(); });
  $("#gOut").textContent = nf(1).format(S.gamma);
  $("#runOpt").addEventListener("click", () => { S.opt = null; runOpt(); });

  function ensureOpt() {
    if (S.opt) return Promise.resolve(S.opt);
    const ver = S.ver, key = ver + "|" + S.gamma;
    if (S.optP && S.optP.key === key) return S.optP.p;
    const pr = job({ cmd: "opt", p: S.p, gamma: S.gamma, N: 900 }).then((d) => { if (ver === S.ver) S.opt = d; return d; });
    S.optP = { key, p: pr }; return pr;
  }
  function runOpt() {
    $("#runOpt").disabled = true; $("#optBusy").innerHTML = '<span class="busy">900 strateji + kişiselleştirme hesaplanıyor…</span>';
    ensureOpt().then(renderOpt).finally(() => { $("#runOpt").disabled = false; $("#optBusy").innerHTML = ""; });
  }
  function renderOpt(d) {
    const scenPts = K.SCENARIOS.map((s, i) => { const r = K.simulate(S.p, K.uniform(s.L, s.u), false); return { label: s.id + " " + s.ad, data: [{ x: r.E, y: r.Pavg }], backgroundColor: SC_COL[i], borderColor: "#fff", borderWidth: 2, pointRadius: 8, pointHoverRadius: 10 }; });
    const ds = [
      { label: "Rastgele stratejiler", data: d.pts, backgroundColor: "rgba(122,128,153,.22)", pointRadius: 2.5, pointHoverRadius: 4 },
      { label: "Pareto sınırı", data: d.pareto.slice().sort((a, b) => a.x - b.x), type: "line", borderColor: SC_COL[1], backgroundColor: SC_COL[1], borderWidth: 2, pointRadius: 3, tension: 0 },
      ...scenPts,
      { label: "Optimum (tek tip)", data: [{ x: d.best.E, y: d.best.Pavg }], backgroundColor: NAVY, pointStyle: "star", pointRadius: 14, borderColor: NAVY, borderWidth: 2 },
      { label: "Kişiselleştirilmiş", data: [{ x: d.personal.E, y: d.personal.Pavg }], backgroundColor: SC_COL[2], pointStyle: "rectRot", pointRadius: 10, borderColor: "#fff", borderWidth: 2 }
    ];
    const opts = { plugins: { legend: { position: "bottom", labels: { filter: (it) => it.text !== "Rastgele stratejiler" || true } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: P̄=${f3(c.parsed.y)}, E=${f3(c.parsed.x)}` } } },
      scales: { x: { title: { display: true, text: "Kuşak dengesi E" }, ticks: { callback: (v) => f2(v) } }, y: { title: { display: true, text: "Ortalama performans P̄" }, ticks: { callback: (v) => f2(v) } } } };
    if (charts.opt) charts.opt.destroy();
    charts.opt = new Chart($("#chOpt"), { type: "scatter", data: { datasets: ds }, options: opts });

    const b = d.best, pe = d.personal, gain = (pe.J - b.J) / Math.abs(b.J);
    let h = `<h3>Tek tip optimum ℓ*</h3><table class="data"><thead><tr>${K.STYLE_SHORT.map((s) => `<th>${s}</th>`).join("")}<th>u*</th></tr></thead>
      <tbody><tr>${b.L.map((v) => `<td>${pc(v)}</td>`).join("")}<td>${pc(b.u)}</td></tr></tbody></table>
      <p class="small" style="margin:.5em 0 .9em">P̄ = <strong>${f3(b.Pavg)}</strong> · E = <strong>${f3(b.E)}</strong> · J = ${f3(b.J)}</p>
      <h3>Kuşağa göre kişiselleştirilmiş ℓ<sub>g</sub>*</h3><table class="data"><thead><tr><th>Kuşak</th>${K.STYLE_SHORT.map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>`;
    K.GENS.forEach((g, i) => (h += `<tr><td><span class="swatch" style="background:${GEN_COL[i]}"></span>${g}</td>${pe.L[g].map((v) => `<td>${pc(v)}</td>`).join("")}</tr>`));
    h += `</tbody></table><p class="small" style="margin-top:.5em">P̄ = <strong>${f3(pe.Pavg)}</strong> · E = <strong>${f3(pe.E)}</strong> · <span class="pill good">J kazancı ${gain >= 0 ? "+" : ""}${pc(gain, 1)}</span></p>`;
    $("#optBox").innerHTML = h;
  }

  /* ===================== Slayt 14: Monte Carlo ===================== */
  $("#pctIn").addEventListener("input", (e) => { S.pct = +e.target.value; $("#pctOut").textContent = pc(S.pct); });
  $("#pctOut").textContent = pc(S.pct);
  $("#runMC").addEventListener("click", () => { S.mc = null; runMC(); });
  function ensureMC() {
    if (S.mc && S.mc.pct === S.pct) return Promise.resolve(S.mc);
    const ver = S.ver, pct = S.pct, key = ver + "|" + pct;
    if (S.mcP && S.mcP.key === key) return S.mcP.p;
    const pr = job({ cmd: "mc", p: S.p, w: S.ahp.w, N: 300, pct }).then((d) => { d.pct = pct; if (ver === S.ver) S.mc = d; return d; });
    S.mcP = { key, p: pr }; return pr;
  }
  const RANK_COL = ["#104281", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4"];
  const PNAME = { aM: "a_M motivasyon büyümesi", bM: "b_M motivasyon aşınması", eta: "η iletişim→motivasyon", kappa: "κ performans→motivasyon",
    aI: "a_I iletişim büyümesi", bI: "b_I iletişim aşınması", psi: "ψ katılım→iletişim", aK: "a_K yenilik büyümesi", bK: "b_K yenilik aşınması", chi: "χ DÖN+KAT→yenilik" };
  function runMC() {
    $("#runMC").disabled = true; $("#mcBusy").innerHTML = '<span class="busy">300 koşu × 5 senaryo…</span>';
    ensureMC().then(renderMC).finally(() => { $("#runMC").disabled = false; $("#mcBusy").innerHTML = ""; });
  }
  function renderMC(d) {
    const labels = K.SCENARIOS.map((s) => s.id + " " + s.ad);
    const ds = [0, 1, 2, 3, 4].map((r) => ({ label: r + 1 + ". sıra", data: d.mc.acc.map((row) => row[r]), backgroundColor: RANK_COL[r], borderColor: "#fff", borderWidth: 1, barPercentage: 0.75 }));
    const optsA = { indexAxis: "y", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => c.dataset.label + ": " + pc(c.parsed.x, 1) } } },
      scales: { x: { stacked: true, min: 0, max: 1, ticks: { callback: (v) => pc(v) } }, y: { stacked: true, grid: { display: false } } } };
    if (charts.acc) charts.acc.destroy();
    charts.acc = new Chart($("#chAcc"), { type: "bar", data: { labels, datasets: ds }, options: optsA });
    const tl = d.tor.map((t) => PNAME[t.k] || t.k);
    const optsT = { indexAxis: "y", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => c.dataset.label + ": ΔP̄ = " + (c.parsed.x >= 0 ? "+" : "") + nf(4).format(c.parsed.x) } } },
      scales: { x: { stacked: true, ticks: { callback: (v) => nf(3).format(v) }, title: { display: true, text: "ΔP̄" } }, y: { stacked: true, grid: { display: false } } } };
    const dsT = [
      { label: "Parametre −" + pc(d.pct), data: d.tor.map((t) => t.lo), backgroundColor: SC_COL[0], borderRadius: 3 },
      { label: "Parametre +" + pc(d.pct), data: d.tor.map((t) => t.hi), backgroundColor: SC_COL[1], borderRadius: 3 }
    ];
    if (charts.tor) charts.tor.destroy();
    charts.tor = new Chart($("#chTor"), { type: "bar", data: { labels: tl, datasets: dsT }, options: optsT });
  }

  /* ===================== Slayt 15: geçerlilik ===================== */
  $("#runVal").addEventListener("click", () => { S.val = null; runVal(); });
  function runVal() {
    $("#runVal").disabled = true; $("#valBusy").innerHTML = '<span class="busy">Testler çalışıyor…</span>'; $("#valSummary").textContent = "";
    const ver = S.ver;
    const pr = S.val ? Promise.resolve(S.val) : job({ cmd: "val", p: S.p, ahp: S.ahp }).then((d) => { if (ver === S.ver) S.val = d; return d; });
    pr.then(renderVal).finally(() => { $("#runVal").disabled = false; $("#valBusy").innerHTML = ""; });
  }
  function renderVal(list) {
    const cls = { "geçti": "good", "kaldı": "bad", "veri bekliyor": "warn" };
    const ico = { "geçti": "✓", "kaldı": "✗", "veri bekliyor": "…" };
    $("#valList").innerHTML = list.map((t) => `<div class="test-row"><div><span class="pill">${t.grp}</span> <strong>${t.ad}</strong><br><span class="tiny">${t.detay}</span></div><span class="pill ${cls[t.durum]}">${ico[t.durum]} ${t.durum}</span></div>`).join("");
    const c = (s) => list.filter((t) => t.durum === s).length;
    $("#valSummary").innerHTML = `<strong>${c("geçti")}</strong> geçti · <strong>${c("kaldı")}</strong> kaldı · <strong>${c("veri bekliyor")}</strong> veri bekliyor`;
  }

  /* ===================== Slayt 16: bulgular ===================== */
  function renderFindings() {
    const box = $("#findings");
    box.innerHTML = '<p class="busy">Optimizasyon ve Monte Carlo sonuçları hesaplanıyor…</p>';
    const ev = evalScen();
    Promise.all([ensureOpt(), ensureMC()]).then(([o, mc]) => {
      const t = ev.topsis, top = t.order[0];
      const byP = ev.res.map((r, i) => i).sort((a, b) => ev.res[b].Pavg - ev.res[a].Pavg);
      const leaders = K.CRITERIA.map((c) => { const i = ev.res.map((r, j) => j).sort((a, b) => ev.res[b][c.k] - ev.res[a][c.k])[0]; return c.ad.split(" (")[0] + ": " + K.SCENARIOS[i].id; });
      const uniqLeaders = new Set(K.CRITERIA.map((c) => ev.res.map((r, j) => j).sort((a, b) => ev.res[b][c.k] - ev.res[a][c.k])[0])).size;
      const gain = (o.personal.J - o.best.J) / Math.abs(o.best.J);
      const pTop = mc.mc.acc[top][0], pTop2 = mc.mc.acc[top][0] + mc.mc.acc[top][1];
      const s1 = ev.res[0], gapMax = Math.max(...ev.res.map((r) => r.gap));
      const gapIdx = ev.res.findIndex((r) => r.gap === gapMax);
      const gapMin = Math.min(...ev.res.map((r) => r.gap)), gapMinIdx = ev.res.findIndex((r) => r.gap === gapMin);
      const act = K.GENS.map((g, i) => i).filter((i) => S.p.w[K.GENS[i]] > 0);
      const lowGen = K.GENS[act.reduce((b2, i) => (ev.res[gapIdx].Mg[i] < ev.res[gapIdx].Mg[b2] ? i : b2), act[0])];
      const maxShare = Math.max(...o.best.L);
      const items = [
        ["Tek ölçüt yanıltır", `Altı ölçütün liderleri <span class="val">${uniqLeaders} farklı senaryoya</span> dağılıyor (${leaders.join(", ")}). Çok ölçütlü değerlendirme zorunlu.`],
        ["Optimum saf bir tarz değil, karmadır", `TOPSIS lideri <span class="val">${K.SCENARIOS[top].id} ${K.SCENARIOS[top].ad}</span> (C* = ${f3(t.C[top])}). Tek tip optimumda en büyük tarz payı <span class="val">${pc(maxShare)}</span>, yani optimum bir iç noktada: ℓ* = ${mixStr(o.best.L)}, u* = ${pc(o.best.u)}.`],
        ["Kuşak açığı strateji seçimine bağlı", `En geniş kuşaklar arası motivasyon açığı <span class="val">${K.SCENARIOS[gapIdx].id} ${K.SCENARIOS[gapIdx].ad}</span> senaryosunda (${f3(gapMax)}); en düşük motivasyon <span class="val">${lowGen}</span> kuşağında. En dar açık ${K.SCENARIOS[gapMinIdx].id} senaryosunda (${f3(gapMin)}).`],
        ["Kişiselleştirme ölçülebilir değer üretir", `Kuşağa göre ayarlanmış ℓ<sub>g</sub>, hedef fonksiyonda <span class="val">${gain >= 0 ? "+" : ""}${pc(gain, 1)}</span> kazanç sağlıyor (E: ${f3(o.best.E)} → ${f3(o.personal.E)}).`],
        ["Sıralama belirsizliğe karşı sağlam", `±${pc(mc.pct)} parametre belirsizliğinde ${K.SCENARIOS[top].id} <span class="val">${pc(pTop)}</span> olasılıkla birinci, <span class="val">${pc(pTop2)}</span> olasılıkla ilk iki sırada.`],
        ["Model geçerlilik testlerini geçiyor", `Yapı, uç koşul, işaret, sayısal ve ÇKKV testleri canlı olarak sağlanıyor. Ampirik doğrulama makale aşamasında yapılacak (bkz. önceki slayt).`]
      ];
      box.innerHTML = items.map((it, i) => `<div class="card finding"><div class="num">${i + 1}</div><div><h3>${it[0]}</h3><p class="small" style="margin:0">${it[1]}</p></div></div>`).join("");
      void s1; void byP;
    }).catch((e) => { box.innerHTML = '<p class="small">Hesaplama hatası: ' + e + "</p>"; });
  }

  /* ===================== gezinme ===================== */
  const slides = $$(".slide");
  let cur = 0, typed = "";
  const hooks = {
    "Parametreler": () => { if (!$("#paramTable").innerHTML) renderParamTable(); },
    "Canlı simülasyon": updateSim,
    "Senaryo analizi": renderScenarios,
    "AHP": renderAHP,
    "TOPSIS": renderTOPSIS,
    "Optimizasyon": () => (S.opt ? renderOpt(S.opt) : runOpt()),
    "Duyarlılık analizi": () => (S.mc && S.mc.pct === S.pct ? renderMC(S.mc) : runMC()),
    "Geçerlilik ve güvenilirlik": runVal,
    "Bulgular": renderFindings
  };
  function refreshCurrent() { const h = hooks[slides[cur].dataset.title]; if (h) h(); }
  function go(i, fromHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => { s.classList.toggle("active", k === i); s.classList.toggle("prev", k < i); });
    cur = i;
    const tp = document.getElementById("tip"); if (tp) tp.classList.remove("show");
    $("#count").textContent = i + 1 + " / " + slides.length;
    $("#progress").style.width = ((i + 1) / slides.length) * 100 + "%";
    const n = $(".notes", slides[i]);
    $("#notesPanel").innerHTML = "<b>" + (i + 1) + ". " + slides[i].dataset.title + "</b> — " + (n ? n.innerHTML : "");
    if (!fromHash) history.replaceState(null, "", "#" + (i + 1));
    document.title = slides[i].dataset.title + " · KDYM";
    refreshCurrent();
  }
  const next = () => go(cur + 1), prev = () => go(cur - 1);
  $("#btnNext").addEventListener("click", next);
  $("#btnPrev").addEventListener("click", prev);
  const toggleNotes = () => $("#notesPanel").classList.toggle("show");
  const toggleFs = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
  $("#btnNotes").addEventListener("click", toggleNotes);
  $("#btnFs").addEventListener("click", toggleFs);
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(slides.length - 1);
    else if (e.key === "n" || e.key === "N") toggleNotes();
    else if (e.key === "f" || e.key === "F") toggleFs();
    else if (/^[0-9]$/.test(e.key)) { typed += e.key; setTimeout(() => (typed = ""), 1500); }
    else if (e.key === "Enter" && typed) { go(parseInt(typed, 10) - 1); typed = ""; }
  });
  let tx = null, ty = null;
  document.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag !== "input" && Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) (dx < 0 ? next : prev)();
    tx = null;
  });
  window.addEventListener("hashchange", () => { const n = parseInt(location.hash.slice(1), 10); if (n && n - 1 !== cur) go(n - 1, true); });

  /* ===================== kısaltma sözlüğü ve açıklama baloncukları ===================== */
  // kategori: m = yöntem, s = sayısal/matematik, l = liderlik tarzı, o = diğer
  const GLOSS = {
    "ÇKKV": ["m", "Çok Kriterli Karar Verme", "Birden fazla ve çoğu zaman birbiriyle çelişen ölçüte göre seçenekleri karşılaştırıp sıralayan yöntemler ailesi. Bu çalışmada AHP (ağırlıklar) ve TOPSIS (sıralama) birlikte kullanılır."],
    "AHP": ["m", "Analytic Hierarchy Process (Analitik Hiyerarşi Süreci)", "Ölçütleri ikişer ikişer karşılaştırıp (Saaty 1–9 ölçeği) karşılaştırma matrisinin özvektöründen ölçüt ağırlıklarını hesaplayan yöntem (Saaty, 1980)."],
    "TOPSIS": ["m", "Technique for Order Preference by Similarity to Ideal Solution", "İdeal çözüme benzerliğe göre sıralama tekniği: seçenekleri en iyi (ideal) çözüme yakınlık ve en kötü çözüme uzaklık oranına göre sıralar (Hwang & Yoon, 1981)."],
    "SMAA": ["m", "Stochastic Multicriteria Acceptability Analysis", "Stokastik çok ölçütlü kabul edilebilirlik analizi: belirsizlik altında her seçeneğin her sırada olma olasılığını hesaplar."],
    "KDYM": ["o", "Kuşak-Duyarlı Yönetim Modeli", "Bu çalışmada önerilen sistem dinamiği + optimizasyon + ÇKKV modeli."],
    "ADD": ["s", "Adi Diferansiyel Denklem", "Tek bir bağımsız değişkene (burada zamana) göre türevleri içeren denklem. KDYM 9 ADD'den oluşur."],
    "RK4": ["s", "Dördüncü mertebe Runge–Kutta yöntemi", "Diferansiyel denklemleri sayısal olarak çözen klasik yöntem; her adımda dört eğim tahmininin ağırlıklı ortalamasını kullanır."],
    "CR": ["s", "Consistency Ratio (Tutarlılık Oranı)", "CR = CI / RI. AHP yargılarının tutarlılığını ölçer; 0,10'un altı kabul edilir."],
    "CI": ["s", "Consistency Index (Tutarlılık İndeksi)", "CI = (λmax − n) / (n − 1). Tam tutarlı matriste 0'dır."],
    "RI": ["s", "Random Index (Rastgele İndeks)", "Rastgele doldurulmuş karşılaştırma matrislerinin ortalama CI değeri; n = 6 için 1,24."],
    "R²": ["s", "Belirlilik katsayısı", "Modelin gözlenen verideki değişkenliğin ne kadarını açıkladığını gösterir (0–1)."],
    "Theil U": ["s", "Theil eşitsizlik istatistikleri", "Model ile gerçek veri arasındaki hatayı yanlılık, varyans ve kovaryans bileşenlerine ayırır; sistem dinamiğinde davranış doğrulamasında kullanılır."],
    "SEM": ["s", "Structural Equation Modeling (Yapısal Eşitlik Modellemesi)", "Gizil değişkenler arasındaki ilişkileri ölçüm modeliyle birlikte tahmin eden istatistiksel yöntem."],
    "PLS": ["s", "Partial Least Squares (Kısmi En Küçük Kareler)", "Varyans temelli yapısal eşitlik modellemesi (PLS-SEM) yaklaşımı."],
    "DÖN": ["l", "Dönüşümcü liderlik", "Vizyon, ilham, entelektüel uyarım ve bireysel ilgi yoluyla çalışanları ortak amaç için dönüştüren liderlik tarzı."],
    "ETK": ["l", "Etkileşimci liderlik (transactional)", "Hedef, ödül ve denetime dayalı karşılıklı alışveriş ilişkisi kuran liderlik tarzı."],
    "KAT": ["l", "Katılımcı liderlik", "Kararlara çalışanların katılımını sağlayan, ortak karar almaya dayalı liderlik tarzı."],
    "DİJ": ["l", "Dijital liderlik (e-liderlik)", "Dijital araçlar ve uzaktan iletişim kanalları üzerinden yürütülen liderlik."],
    "AS1": ["o", "Araştırma Sorusu 1", "Kuşak duyarlılıklarının performansa dinamik etkisi"],
    "AS2": ["o", "Araştırma Sorusu 2", "Senaryoların çok ölçütlü sıralaması"],
    "AS3": ["o", "Araştırma Sorusu 3", "Optimum karma ve kişiselleştirmenin değeri"],
    "AS4": ["o", "Araştırma Sorusu 4", "Sağlamlık ve geçerlilik"],
    "R1": ["o", "Pekiştiren döngü 1 (Reinforcing)", "Başarı sarmalı: motivasyon → yenilik → performans → motivasyon."],
    "R2": ["o", "Pekiştiren döngü 2 (Reinforcing)", "İletişim kaldıracı: iletişim → motivasyon ve yenilik → performans."],
    "B1": ["o", "Dengeleyen döngü 1 (Balancing)", "Doygunluk ve aşınma: stoklar sınırsız büyümez."],
    "S1": ["o", "Senaryo 1: Geleneksel–Etkileşimci", "ℓ = 15/60/10/15, u = 0,30"],
    "S2": ["o", "Senaryo 2: Dönüşümcü", "ℓ = 60/15/15/10, u = 0,50"],
    "S3": ["o", "Senaryo 3: Katılımcı", "ℓ = 15/10/60/15, u = 0,50"],
    "S4": ["o", "Senaryo 4: Dijital-öncelikli", "ℓ = 15/10/15/60, u = 0,85"],
    "S5": ["o", "Senaryo 5: Hibrit-Uyarlanabilir", "ℓ = 35/15/25/25, u = 0,65"],
    "CSP": ["o", "Content Security Policy (İçerik Güvenliği Politikası)", "Tarayıcıya sayfanın hangi kaynaklara erişebileceğini bildiren güvenlik kuralı. Burada dış bağlantılar tamamen kapalıdır."],
    "DOI": ["o", "Digital Object Identifier", "Bilimsel yayının kalıcı dijital kimliği; doi.org üzerinden doğrudan yayına gider."],
    "Öğr. Gör. Dr.": ["o", "Öğretim Görevlisi Doktor", "Akademik unvan."],
    "vd.": ["o", "ve diğerleri", "Üç veya daha fazla yazarlı kaynaklarda ilk yazardan sonra kullanılır (İng. et al.)."]
  };
  const keys = Object.keys(GLOSS).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const RX = new RegExp("(?<![\\p{L}\\p{N}])(" + keys.join("|") + ")(?![\\p{L}\\p{N}])", "gu");
  const SKIP = "script,style,.katex,svg,select,option,textarea,button,a,.ab,.tip,canvas,input,.sign";
  function wrapAbbr(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const t = n.nodeValue; RX.lastIndex = 0;
      if (!RX.test(t)) return;
      RX.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = RX.exec(t))) {
        if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        const g = GLOSS[m[1]], el = document.createElement("abbr");
        el.className = "ab ab-" + g[0]; el.textContent = m[1]; el.tabIndex = 0;
        el.dataset.tip = "<b>" + m[1] + "</b> · " + g[1] + (g[2] ? "<br><span>" + g[2] + "</span>" : "");
        frag.appendChild(el); last = m.index + m[1].length;
      }
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }
  const tip = $("#tip"); let pinned = null;
  function showTip(el) {
    tip.innerHTML = el.dataset.tip; tip.classList.add("show");
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), innerWidth - tw - 8);
    let y = r.bottom + 8; if (y + th > innerHeight - 8) y = r.top - th - 8;
    tip.style.left = x + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.classList.remove("show"); pinned = null; };
  document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (el && !pinned) showTip(el); });
  document.addEventListener("mouseout", (e) => { const el = e.target.closest("[data-tip]"); if (el && !pinned) tip.classList.remove("show"); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) showTip(el); });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-tip]");
    if (el) { e.stopPropagation(); if (pinned === el) hideTip(); else { pinned = el; showTip(el); } }
    else if (pinned) hideTip();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });

  /* ===================== başlat ===================== */
  renderMathInElement(document.body, { delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }], throwOnError: false });
  wrapAbbr($("#deck"));
  let wrapT = null;
  new MutationObserver(() => { clearTimeout(wrapT); wrapT = setTimeout(() => wrapAbbr($("#deck")), 30); })
    .observe($("#deck"), { childList: true, subtree: true });
  renderParamTable();
  buildSimControls();
  const h0 = parseInt(location.hash.slice(1), 10);
  go(h0 ? h0 - 1 : 0, true);
  // sunum açılır açılmaz ağır hesapları arka planda ısıt
  setTimeout(() => { ensureOpt().then(() => ensureMC()).catch(() => {}); }, 800);
})();
