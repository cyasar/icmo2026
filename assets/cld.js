/* Etkileşimli nedensel döngü diyagramı (KDYM) */
(function () {
  "use strict";
  const K = window.KDYM, NS = "http://www.w3.org/2000/svg";
  const host = document.getElementById("cldHost");
  if (!host) return;

  const N = {
    L: { x: 110, y: 340, t: "in", lab: ["Liderlik", "karması ℓ"], def: "<b>Karar değişkeni.</b> Dört liderlik tarzının payları: DÖN, ETK, KAT, DİJ (toplamı 1)." },
    U: { x: 110, y: 600, t: "in", lab: ["Kanal payı u", "kuşak tercihi δ"], def: "<b>Karar değişkeni</b> u: dijital iletişim kanalı payı. δ<sub>g</sub>: kuşağın tercih ettiği dijital pay." },
    F: { x: 320, y: 190, t: "aux", lab: ["Uyum F"], def: "<b>Liderlik–kuşak uyumu</b> (Denklem 1). Liderlik karmasının kuşağın duyarlılıklarıyla örtüşmesi." },
    Q: { x: 320, y: 490, t: "aux", lab: ["Kanal", "uyumu Q"], def: "<b>Kanal uyumu</b> Q = 1 − |u − δ<sub>g</sub>| (Denklem 3)." },
    M: { x: 540, y: 190, t: "stock", lab: ["Motivasyon M"], def: "<b>Stok:</b> motivasyon (Denklem 2). Uyum, iletişim ve başarıyla beslenir; aşınır." },
    I: { x: 540, y: 490, t: "stock", lab: ["İletişim I"], def: "<b>Stok:</b> iletişim etkinliği (Denklem 3). Kanal uyumu ve katılımla büyür." },
    K: { x: 780, y: 190, t: "stock", lab: ["Yenilik K"], def: "<b>Stok:</b> yenilik kapasitesi (Denklem 5). Motivasyon × iletişim ile birikir." },
    V: { x: 780, y: 490, t: "aux", lab: ["Karar hızı V"], def: "<b>Yardımcı değişken:</b> karar alma hızı (Denklem 4). Etkileşimci tarz hızlı, katılımcı tarz yavaştır." },
    P: { x: 990, y: 340, t: "out", lab: ["Performans P"], def: "<b>Çıktı:</b> örgütsel performans (Denklem 6). M, I, K ve V'nin Cobb–Douglas birleşimi." }
  };
  const W = 150, H = 56;
  const E = [
    { id: "LF", d: "M150 310 L 268 222", s: "+" },
    { id: "UQ", d: "M185 588 L 255 524", s: "+" },
    { id: "FM", d: "M395 190 L 460 190", s: "+" },
    { id: "QI", d: "M395 490 L 460 490", s: "+" },
    { id: "IM", d: "M540 462 L 540 224", s: "+" },
    { id: "LI", d: "M185 358 Q 330 445 460 484", s: "+" },
    { id: "LV", d: "M185 345 Q 470 352 700 470", s: "−", neg: true },
    { id: "MK", d: "M615 190 L 700 190", s: "+" },
    { id: "IK", d: "M598 462 L 728 224", s: "+" },
    { id: "MP", d: "M615 206 L 910 330", s: "+" },
    { id: "KP", d: "M855 210 L 934 308", s: "+" },
    { id: "IV", d: "M615 490 L 700 490", s: "+" },
    { id: "VP", d: "M855 472 L 934 372", s: "+" },
    { id: "IP", d: "M612 468 Q 770 390 910 352", s: "+" },
    { id: "PM", d: "M990 310 C 990 -5, 620 -5, 560 156", s: "+" },
    { id: "BM", d: "M478 162 C 452 100, 528 100, 506 158", s: "−", self: true },
    { id: "BK", d: "M718 162 C 692 100, 768 100, 746 158", s: "−", self: true },
    { id: "BI", d: "M478 518 C 452 580, 528 580, 506 522", s: "−", self: true }
  ];
  const LOOPS = {
    R1: { b: "R1 Başarı sarmalı", cls: "r", e: ["MK", "KP", "PM"], n: ["M", "K", "P"],
      h: "R1 · Pekiştiren döngü: başarı sarmalı",
      t: "Motivasyon yeniliği, yenilik performansı, performans da yeniden motivasyonu besler. Kendini güçlendirir: iyi başlangıç büyür, kötü başlangıç da büyür. Etkisi gecikmelidir, çünkü üç stok da zamanla birikir." },
    R2: { b: "R2 Doğrudan geri besleme", cls: "r", e: ["MP", "PM"], n: ["M", "P"],
      h: "R2 · Pekiştiren döngü: başarının motivasyona etkisi",
      t: "Performans motivasyonu κ oranında doğrudan besler (M → P → M). Başarıyı görünür kılmak motivasyonu artırır." },
    B1: { b: "B1 Doygunluk ve aşınma", cls: "b", e: ["BM", "BK", "BI"], n: ["M", "K", "I"],
      h: "B1 · Dengeleyen döngüler: doygunluk ve aşınma",
      t: "Her stok (1 − x) ile sınırlanır ve sabit oranla aşınır (b<sub>M</sub>, b<sub>I</sub>, b<sub>K</sub>). Sınırsız büyüme olmaz; beslenmeyen stok erir." },
    LEV: { b: "İletişim kaldıracı", cls: "y", e: ["UQ", "QI", "IM", "IK", "IV", "IP"], n: ["U", "Q", "I", "M", "K", "V", "P"],
      h: "İletişim kaldıracı · ileri besleme yolu",
      t: "Kanal uyumu iletişimi, iletişim de motivasyonu, yeniliği, karar hızını ve doğrudan performansı artırır. Bu bir döngü değil, tek bir müdahalenin dört farklı kanaldan performansa ulaştığı <b>kaldıraç yoludur</b>." },
    TR: { b: "Ödünleşim: katılım ↔ hız", cls: "t", e: ["LI", "LV"], n: ["L", "I", "V"],
      h: "Ödünleşim · katılım ile karar hızı",
      t: "Katılımcı ağırlık iletişimi güçlendirir (+), karar hızını düşürür (−). İki etki aynı karardan doğduğu için optimum saf bir tarz değil, <b>iç noktadaki bir karmadır</b>." }
  };
  const ORDER = ["R1", "R2", "B1", "LEV", "TR"];

  /* ---------- SVG kur ---------- */
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const svg = el("svg", { viewBox: "0 -10 1090 650", class: "cld", role: "img", "aria-label": "Etkileşimli nedensel döngü diyagramı" }, host);
  const defs = el("defs", {}, svg);
  [["arP", "#5b6280"], ["arN", "#c0392b"], ["arH", "#1f2a6b"]].forEach(([id, c]) => {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: c }, m);
  });
  const grad = el("linearGradient", { id: "stockFill", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  el("stop", { offset: "0", "stop-color": "#2a78d6", "stop-opacity": ".55" }, grad);
  el("stop", { offset: "1", "stop-color": "#6da7ec", "stop-opacity": ".35" }, grad);
  const glow = el("filter", { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  el("feGaussianBlur", { stdDeviation: "6", result: "b" }, glow);
  const fm = el("feMerge", {}, glow); el("feMergeNode", { in: "b" }, fm); el("feMergeNode", { in: "SourceGraphic" }, fm);

  const gE = el("g", { class: "cld-edges" }, svg);
  const gS = el("g", { class: "cld-signs" }, svg);
  const gP = el("g", { class: "cld-particles" }, svg);
  const gN = el("g", { class: "cld-nodes" }, svg);
  const gL = el("g", { class: "cld-looplabels" }, svg);

  const edgeEl = {};
  E.forEach((e) => {
    const p = el("path", { id: "cld-" + e.id, d: e.d, class: "edge" + (e.neg ? " neg" : "") + (e.self ? " self" : ""), "marker-end": e.neg ? "url(#arN)" : "url(#arP)" }, gE);
    edgeEl[e.id] = p;
    const len = p.getTotalLength(), mid = p.getPointAtLength(len * (e.self ? 0.5 : 0.55)), a = p.getPointAtLength(len * 0.5 - 1), b = p.getPointAtLength(len * 0.5 + 1);
    let nx = -(b.y - a.y), ny = b.x - a.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const off = e.self ? 0 : 14;
    const t = el("text", { x: mid.x + nx * off, y: mid.y + ny * off + 6, class: "sign" + (e.s === "−" ? " neg" : ""), "text-anchor": "middle" }, gS);
    t.textContent = e.s; e.signEl = t;
  });

  const nodeEl = {};
  Object.keys(N).forEach((k) => {
    const n = N[k], g = el("g", { class: "node " + n.t, tabindex: 0, "data-k": k, transform: `translate(${n.x - W / 2},${n.y - H / 2})` }, gN);
    el("rect", { class: "nbg", width: W, height: H, rx: n.t === "stock" ? 6 : 14 }, g);
    if (n.t === "stock") {
      const cp = el("clipPath", { id: "clip-" + k }, defs); el("rect", { width: W, height: H, rx: 6 }, cp);
      n.fill = el("rect", { class: "nfill", x: 0, y: H, width: W, height: 0, "clip-path": `url(#clip-${k})`, fill: "url(#stockFill)" }, g);
    }
    el("rect", { class: "nframe", width: W, height: H, rx: n.t === "stock" ? 6 : 14 }, g);
    n.lab.forEach((line, i) => { const t = el("text", { x: W / 2, y: H / 2 + (n.lab.length === 1 ? -2 : -10 + i * 17), class: "nlab", "text-anchor": "middle" }, g); t.textContent = line; });
    n.val = el("text", { x: W / 2, y: H - 7, class: "nval", "text-anchor": "middle" }, g);
    nodeEl[k] = g;
  });
  [["R1", 852, 258], ["R2", 945, 185], ["B1", 492, 96], ["B1", 732, 96], ["B1", 492, 600]].forEach(([t, x, y]) => {
    const g = el("g", { class: "looplab " + (t[0] === "R" ? "r" : "b"), transform: `translate(${x},${y})` }, gL);
    el("circle", { r: 17 }, g); const tx = el("text", { "text-anchor": "middle", y: 5 }, g); tx.textContent = t;
    const arc = el("path", { d: "M -9 -12 A 15 15 0 1 1 -14 4", class: "looparc" }, g); void arc;
  });

  /* ---------- etkileşim ---------- */
  const info = document.getElementById("cldInfo");
  const defaultInfo = info.innerHTML;
  let active = null, tourT = null;
  function clearParticles() { while (gP.firstChild) gP.removeChild(gP.firstChild); }
  function particles(ids, cls) {
    clearParticles();
    ids.forEach((id, j) => {
      for (let q = 0; q < 3; q++) {
        const c = el("circle", { r: 6, class: "pt " + cls }, gP);
        const am = el("animateMotion", { dur: "2.4s", repeatCount: "indefinite", begin: (q * 0.8 + j * 0.15) + "s", rotate: "auto" }, c);
        const mp = el("mpath", {}, am); mp.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#cld-" + id); mp.setAttribute("href", "#cld-" + id);
      }
    });
  }
  function highlight(edges, nodes, cls) {
    svg.classList.add("focus");
    Object.keys(edgeEl).forEach((id) => { const on = edges.includes(id); edgeEl[id].classList.toggle("on", on); edgeEl[id].setAttribute("marker-end", on ? (E.find((e) => e.id === id).neg ? "url(#arN)" : "url(#arH)") : (E.find((e) => e.id === id).neg ? "url(#arN)" : "url(#arP)")); });
    E.forEach((e) => e.signEl.classList.toggle("on", edges.includes(e.id)));
    Object.keys(nodeEl).forEach((k) => nodeEl[k].classList.toggle("on", nodes.includes(k)));
    svg.setAttribute("data-mode", cls || "");
  }
  function reset() {
    svg.classList.remove("focus"); svg.removeAttribute("data-mode"); clearParticles(); active = null;
    Object.values(edgeEl).forEach((p) => p.classList.remove("on")); E.forEach((e) => e.signEl.classList.remove("on"));
    Object.values(nodeEl).forEach((g) => g.classList.remove("on"));
    document.querySelectorAll("#loopBtns .lb").forEach((b) => b.classList.remove("act"));
    info.innerHTML = defaultInfo;
  }
  function showLoop(key) {
    const L = LOOPS[key]; active = key;
    highlight(L.e, L.n, L.cls); particles(L.e, L.cls);
    document.querySelectorAll("#loopBtns .lb").forEach((b) => b.classList.toggle("act", b.dataset.k === key));
    info.innerHTML = `<h3><span class="pill ${L.cls === "b" ? "bad" : L.cls === "t" ? "warn" : L.cls === "y" ? "good" : ""}">${key === "LEV" ? "Yol" : key === "TR" ? "Ödünleşim" : key}</span> ${L.h.split("·")[1] || L.h}</h3><p class="small">${L.t}</p>`;
  }
  const btns = document.getElementById("loopBtns");
  btns.innerHTML = ORDER.map((k) => `<button class="lb ${LOOPS[k].cls}" data-k="${k}">${LOOPS[k].b}</button>`).join("") +
    `<button class="lb tour" id="cldTour">▶ Döngü turu</button><button class="lb ghost" id="cldReset">Tümü</button>`;
  btns.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "cldReset") { stopTour(); reset(); return; }
    if (b.id === "cldTour") { tourT ? stopTour() : startTour(); return; }
    stopTour(); active === b.dataset.k ? reset() : showLoop(b.dataset.k);
  });
  function startTour() {
    let i = 0; document.getElementById("cldTour").textContent = "■ Turu durdur";
    const step = () => { showLoop(ORDER[i % ORDER.length]); i++; if (i > ORDER.length) { stopTour(); reset(); return; } tourT = setTimeout(step, 4200); };
    step();
  }
  function stopTour() { clearTimeout(tourT); tourT = null; const t = document.getElementById("cldTour"); if (t) t.textContent = "▶ Döngü turu"; }

  // düğüm üzerine gelince bağlantıları göster
  const conn = { L: ["LF", "LI", "LV"], U: ["UQ"], F: ["LF", "FM"], Q: ["UQ", "QI"], M: ["FM", "IM", "MK", "MP", "PM", "BM"], I: ["QI", "LI", "IM", "IK", "IV", "IP", "BI"],
    K: ["MK", "IK", "KP", "BK"], V: ["LV", "IV", "VP"], P: ["MP", "KP", "VP", "IP", "PM"] };
  gN.addEventListener("mouseover", (e) => {
    const g = e.target.closest(".node"); if (!g || active) return; const k = g.dataset.k;
    highlight(conn[k], [k], "n"); info.innerHTML = `<h3>${N[k].lab.join(" ")}</h3><p class="small">${N[k].def}</p><p class="small" id="cldNodeVal"></p>`; updateNodeVal(k);
  });
  gN.addEventListener("mouseout", (e) => { if (e.target.closest(".node") && !active) { svg.classList.remove("focus"); Object.values(edgeEl).forEach((p) => p.classList.remove("on")); E.forEach((x) => x.signEl.classList.remove("on")); Object.values(nodeEl).forEach((g) => g.classList.remove("on")); } });

  /* ---------- zaman oynatıcı (canlı simülasyon) ---------- */
  const slider = document.getElementById("cldTime"), tOut = document.getElementById("cldT"), playB = document.getElementById("cldPlay");
  let tr = null, extra = null, raf = null, idx = 0;
  const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function compute() {
    const app = window.KDYM_APP, p = app ? app.getP() : K.defaultParams();
    const st = app ? app.getStrat() : K.uniform(K.SCENARIOS[4].L, K.SCENARIOS[4].u);
    const r = K.simulate(p, st, true); tr = r.trace;
    let ws = 0; K.GENS.forEach((g) => (ws += p.w[g]));
    const w = K.GENS.map((g) => p.w[g] / (ws || 1));
    tr.Mb = tr.t.map((_, j) => w.reduce((a, wi, i) => a + wi * tr.M[i][j], 0));
    tr.Ib = tr.t.map((_, j) => w.reduce((a, wi, i) => a + wi * tr.I[i][j], 0));
    extra = {
      F: K.GENS.reduce((a, g, i) => a + w[i] * K.fit(p.beta[g], st.L[g], p.rho), 0),
      Q: K.GENS.reduce((a, g, i) => a + w[i] * (1 - Math.abs(st.u - p.delta[g])), 0),
      L: st.L.Y, u: st.u
    };
    slider.max = tr.t.length - 1; if (idx > slider.max) idx = +slider.max;
    render(idx);
  }
  function setStock(k, v) { const n = N[k]; const h = Math.max(0, Math.min(1, v)) * H; n.fill.setAttribute("y", H - h); n.fill.setAttribute("height", h); n.val.textContent = nf.format(v); }
  function render(j) {
    idx = j; slider.value = j; tOut.textContent = Math.round(tr.t[j]);
    setStock("M", tr.Mb[j]); setStock("I", tr.Ib[j]); setStock("K", tr.K[j]);
    N.V.val.textContent = nf.format(tr.V[j]); N.P.val.textContent = nf.format(tr.P[j]);
    N.F.val.textContent = nf.format(extra.F); N.Q.val.textContent = nf.format(extra.Q);
    N.L.val.textContent = extra.L.map((v) => Math.round(v * 100)).join("/");
    N.U.val.textContent = "u = " + nf.format(extra.u);
    const pg = nodeEl.P.querySelector(".nframe"); pg.style.strokeWidth = (2 + 6 * tr.P[j]).toFixed(1);
    if (document.getElementById("cldNodeVal")) updateNodeVal(document.querySelector(".cld .node.on") && document.querySelector(".cld .node.on").dataset.k);
  }
  function updateNodeVal(k) {
    const b = document.getElementById("cldNodeVal"); if (!b || !k || !tr) return;
    const map = { M: tr.Mb[idx], I: tr.Ib[idx], K: tr.K[idx], V: tr.V[idx], P: tr.P[idx], F: extra.F, Q: extra.Q };
    if (map[k] !== undefined) b.innerHTML = `${Math.round(tr.t[idx])}. ayda değer: <b>${nf.format(map[k])}</b>`;
  }
  slider.addEventListener("input", () => { stopPlay(); render(+slider.value); });
  function play() {
    if (raf) { stopPlay(); return; }
    if (idx >= tr.t.length - 1) idx = 0;
    playB.textContent = "■ Durdur"; const start = performance.now(), from = idx, total = 6000 * (1 - from / (tr.t.length - 1));
    const step = (now) => { const f = Math.min(1, (now - start) / total); render(Math.round(from + f * (tr.t.length - 1 - from))); if (f < 1) raf = requestAnimationFrame(step); else stopPlay(); };
    raf = requestAnimationFrame(step);
  }
  function stopPlay() { if (raf) cancelAnimationFrame(raf); raf = null; playB.textContent = "▶ Zamanı oynat"; }
  playB.addEventListener("click", play);

  window.CLD = { refresh: () => { compute(); }, leave: () => { stopTour(); stopPlay(); } };
  compute();
})();
