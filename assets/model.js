/* =====================================================================
 * KUŞAK-DUYARLI YÖNETİM MODELİ (KDYM)
 * Sistem dinamiği + optimizasyon + ÇKKV (AHP–TOPSIS) çekirdeği
 * Yazar: Cumali YAŞAR — IV. Örgütlerin Yönetimi Uluslararası Kongresi
 *
 * ÖNEMLİ: Varsayılan parametreler AMPİRİK TAHMİN DEĞİLDİR. Yönleri literatürle
 * uyumlu, büyüklükleri gösterim amaçlıdır. Kalibrasyon makale aşamasındadır.
 * ===================================================================== */
(function (global) {
  "use strict";

  const GENS = ["Y", "Z", "Alfa", "C"];
  const STYLES = ["Dönüşümcü", "Etkileşimci", "Katılımcı", "Dijital"];
  const STYLE_SHORT = ["DÖN", "ETK", "KAT", "DİJ"];

  /* ---------- Varsayılan (gösterim amaçlı) parametreler ---------- */
  function defaultParams() {
    return {
      T: 36,            // ufuk (ay)
      dt: 0.5,          // RK4 adımı (ay)
      rho: 0.6,         // liderlik repertuvarı tamamlayıcılığı (ρ=1: doğrusal)
      // kuşak parametreleri
      beta: {           // liderlik tarzı uyumu β_g = (DÖN, ETK, KAT, DİJ)
        Y:    [0.75, 0.65, 0.65, 0.45],
        Z:    [0.80, 0.30, 0.75, 0.85],
        Alfa: [0.70, 0.20, 0.70, 0.95],
        C:    [0.65, 0.35, 0.85, 0.90]
      },
      delta: { Y: 0.45, Z: 0.80, Alfa: 0.95, C: 0.85 }, // dijital kanal tercihi δ_g
      w:     { Y: 0.50, Z: 0.35, Alfa: 0.05, C: 0.10 }, // işgücü bileşimi w_g
      // küresel parametreler
      aM: 0.15, bM: 0.05, eta: 0.30, kappa: 0.15,       // motivasyon
      aI: 0.133, bI: 0.06, psi: 0.50,                     // iletişim
      aK: 0.075, bK: 0.04, chi: 0.60,                     // yenilik
      s: [0.85, 1.00, 0.45, 0.90],                       // tarzların karar hızı katsayısı
      theta: [0.30, 0.25, 0.25, 0.20],                   // performans esneklikleri (M, I, K, V)
      M0: 0.5, I0: 0.5, K0: 0.3
    };
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  /* (1) Uyum: F = Σ β_k ℓ_k^ρ / 4^(1−ρ)  — ρ<1 iken azalan getiri (davranışsal karmaşıklık) */
  function fit(beta, L, rho) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += beta[k] * Math.pow(L[k], rho);
    return s / Math.pow(4, 1 - rho);
  }

  function normW(p) {
    let s = 0; GENS.forEach((g) => (s += p.w[g]));
    const w = {}; GENS.forEach((g) => (w[g] = s > 0 ? p.w[g] / s : 0.25));
    return w;
  }

  /* strateji: { L: {Y:[4],Z:[4],...}, u } — tek tip strateji için uniform() */
  function uniform(L, u) {
    const o = { L: {}, u: u };
    GENS.forEach((g) => (o.L[g] = L.slice()));
    return o;
  }

  /* örgüt düzeyi (ağırlıklı) liderlik vektörü L̄ */
  function meanL(strat, w) {
    const m = [0, 0, 0, 0];
    GENS.forEach((g) => { for (let k = 0; k < 4; k++) m[k] += w[g] * strat.L[g][k]; });
    return m;
  }

  /* -------- Denklemler: durum x = [M_Y..M_C, I_Y..I_C, K] -------- */
  function aux(x, p, strat, w, Lb) {
    let Mbar = 0, Ibar = 0, MI = 0;
    for (let i = 0; i < 4; i++) {
      const g = GENS[i];
      Mbar += w[g] * x[i]; Ibar += w[g] * x[4 + i]; MI += w[g] * x[i] * x[4 + i];
    }
    const K = x[8];
    const V = dot(p.s, Lb) * (0.5 + 0.5 * Ibar);                 // (4) karar hızı
    const th = p.theta;
    const P = Math.pow(Mbar, th[0]) * Math.pow(Ibar, th[1]) *
              Math.pow(Math.max(K, 1e-9), th[2]) * Math.pow(Math.max(V, 1e-9), th[3]); // (6)
    return { Mbar, Ibar, MI, K, V, P };
  }

  function deriv(x, p, strat, w, Lb) {
    const a = aux(x, p, strat, w, Lb);
    const d = new Array(9);
    const commBoost = 1 + p.psi * Lb[2];   // v1.1: (1+ψ) normalizasyonu kaldırıldı (işaret testi)
    for (let i = 0; i < 4; i++) {
      const g = GENS[i];
      const F = fit(p.beta[g], strat.L[g], p.rho);                  // (1) uyum
      const drive = (1 - p.eta - p.kappa) * F + p.eta * x[4 + i] + p.kappa * a.P;
      d[i] = p.aM * drive * (1 - x[i]) - p.bM * x[i];               // (2) motivasyon
      const Q = 1 - Math.abs(strat.u - p.delta[g]);                // kanal uyumu
      d[4 + i] = p.aI * Q * commBoost * (1 - x[4 + i]) - p.bI * x[4 + i]; // (3) iletişim
    }
    const innov = 1 + p.chi * (Lb[0] + Lb[2]); // v1.1: aynı düzeltme
    d[8] = p.aK * a.MI * innov * (1 - x[8]) - p.bK * x[8];          // (5) yenilik
    return d;
  }

  /* RK4 ile benzetim. full=false ise sadece özet döner (hızlı) */
  function simulate(p, strat, full) {
    const w = normW(p);
    const Lb = meanL(strat, w);
    const n = Math.round(p.T / p.dt);
    let x = [p.M0, p.M0, p.M0, p.M0, p.I0, p.I0, p.I0, p.I0, p.K0];
    const tr = full ? { t: [], M: [[], [], [], []], I: [[], [], [], []], K: [], V: [], P: [] } : null;
    let Psum = 0, Pprev = null;
    const record = (t, a) => {
      if (!tr) return;
      tr.t.push(+t.toFixed(2));
      for (let i = 0; i < 4; i++) { tr.M[i].push(x[i]); tr.I[i].push(x[4 + i]); }
      tr.K.push(x[8]); tr.V.push(a.V); tr.P.push(a.P);
    };
    let a0 = aux(x, p, strat, w, Lb); record(0, a0); Pprev = a0.P;
    const add = (u, v, h) => u.map((ui, i) => ui + h * v[i]);
    for (let k = 1; k <= n; k++) {
      const h = p.dt;
      const k1 = deriv(x, p, strat, w, Lb);
      const k2 = deriv(add(x, k1, h / 2), p, strat, w, Lb);
      const k3 = deriv(add(x, k2, h / 2), p, strat, w, Lb);
      const k4 = deriv(add(x, k3, h), p, strat, w, Lb);
      x = x.map((xi, i) => clamp01(xi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])));
      const a = aux(x, p, strat, w, Lb);
      Psum += 0.5 * (Pprev + a.P) * h; Pprev = a.P;              // yamuk kuralı
      if (tr) record(k * h, a);
    }
    const aT = aux(x, p, strat, w, Lb);
    // kuşaklar arası denge E = 1 − σ_M / M̄ (ağırlıklı)
    let v = 0;
    for (let i = 0; i < 4; i++) v += w[GENS[i]] * Math.pow(x[i] - aT.Mbar, 2);
    const E = 1 - Math.sqrt(v) / aT.Mbar;
    let gap = 0; const act = [0,1,2,3].filter((i) => w[GENS[i]] > 0);
    act.forEach((i) => act.forEach((j) => (gap = Math.max(gap, x[i] - x[j]))));
    return {
      Pavg: Psum / p.T, P: aT.P, M: aT.Mbar, I: aT.Ibar, K: aT.K, V: aT.V, E: E, gap: gap,
      Mg: x.slice(0, 4), Ig: x.slice(4, 8), trace: tr, Lbar: Lb
    };
  }

  /* ---------------- Senaryolar ---------------- */
  const SCENARIOS = [
    { id: "S1", ad: "Geleneksel–Etkileşimci", L: [0.15, 0.60, 0.10, 0.15], u: 0.30 },
    { id: "S2", ad: "Dönüşümcü",              L: [0.60, 0.15, 0.15, 0.10], u: 0.50 },
    { id: "S3", ad: "Katılımcı",              L: [0.15, 0.10, 0.60, 0.15], u: 0.50 },
    { id: "S4", ad: "Dijital-öncelikli",      L: [0.15, 0.10, 0.15, 0.60], u: 0.85 },
    { id: "S5", ad: "Hibrit-Uyarlanabilir",   L: [0.35, 0.15, 0.25, 0.25], u: 0.65 }
  ];

  const CRITERIA = [
    { k: "Pavg", ad: "Performans (P̄)" },
    { k: "M", ad: "Motivasyon (M̄)" },
    { k: "I", ad: "İletişim (Ī)" },
    { k: "V", ad: "Karar hızı (V)" },
    { k: "K", ad: "Yenilik (K)" },
    { k: "E", ad: "Kuşak dengesi (E)" }
  ];

  /* ---------------- AHP ---------------- */
  const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45 };
  function ahp(A) {
    const n = A.length;
    let wv = new Array(n).fill(1 / n);
    for (let it = 0; it < 200; it++) {
      const nw = A.map((row) => row.reduce((s, a, j) => s + a * wv[j], 0));
      const s = nw.reduce((a, b) => a + b, 0);
      wv = nw.map((v) => v / s);
    }
    const Aw = A.map((row) => row.reduce((s, a, j) => s + a * wv[j], 0));
    const lmax = Aw.reduce((s, v, i) => s + v / wv[i], 0) / n;
    const CI = (lmax - n) / (n - 1);
    const CR = RI[n] ? CI / RI[n] : 0;
    return { w: wv, lmax, CI, CR };
  }

  function defaultAHP() {
    // üst üçgen (Saaty 1–9). Sıra: P, M, I, V, K, E
    const U = [
      [1, 2, 3, 3, 2, 3],
      [0, 1, 2, 2, 1, 2],
      [0, 0, 1, 1, 0.5, 1],
      [0, 0, 0, 1, 0.5, 1],
      [0, 0, 0, 0, 1, 2],
      [0, 0, 0, 0, 0, 1]
    ];
    return fillReciprocal(U);
  }
  function fillReciprocal(U) {
    const n = U.length, A = [];
    for (let i = 0; i < n; i++) { A.push([]); for (let j = 0; j < n; j++) A[i].push(1); }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { A[i][j] = U[i][j]; A[j][i] = 1 / U[i][j]; }
    return A;
  }

  /* ---------------- TOPSIS (tüm ölçütler fayda yönlü) ---------------- */
  function topsis(X, w) {
    const m = X.length, n = w.length;
    const norm = new Array(n).fill(0);
    for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < m; i++) s += X[i][j] * X[i][j]; norm[j] = Math.sqrt(s) || 1; }
    const V = X.map((r) => r.map((x, j) => (w[j] * x) / norm[j]));
    const best = [], worst = [];
    for (let j = 0; j < n; j++) { const col = V.map((r) => r[j]); best.push(Math.max(...col)); worst.push(Math.min(...col)); }
    const C = V.map((r) => {
      let dp = 0, dn = 0;
      for (let j = 0; j < n; j++) { dp += (r[j] - best[j]) ** 2; dn += (r[j] - worst[j]) ** 2; }
      dp = Math.sqrt(dp); dn = Math.sqrt(dn);
      return dn / (dp + dn || 1);
    });
    const order = C.map((c, i) => i).sort((a, b) => C[b] - C[a]);
    const rank = new Array(m); order.forEach((idx, r) => (rank[idx] = r + 1));
    return { C, rank, order };
  }

  function evaluateScenarios(p, wCrit, scen) {
    scen = scen || SCENARIOS;
    const res = scen.map((s) => simulate(p, uniform(s.L, s.u), false));
    const X = res.map((r) => CRITERIA.map((c) => r[c.k]));
    const t = topsis(X, wCrit);
    return { res, X, topsis: t };
  }

  /* ---------------- Optimizasyon ---------------- */
  // Basit ve tekrarlanabilir PRNG (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dirichlet(r) { // Dir(1,1,1,1): simpleks üzerinde düzgün
    const e = [0, 0, 0, 0].map(() => -Math.log(1 - r()));
    const s = e[0] + e[1] + e[2] + e[3];
    return e.map((v) => v / s);
  }
  const objective = (res, gamma) => res.Pavg - gamma * (1 - res.E);

  /* Rastgele arama + yerel iyileştirme; Pareto kümesi (P̄, E) */
  function optimizeUniform(p, opts) {
    const N = opts.N || 1200, gamma = opts.gamma ?? 2, r = rng(opts.seed || 2026);
    const pts = [];
    let best = null;
    for (let i = 0; i < N; i++) {
      const L = dirichlet(r), u = r();
      const res = simulate(p, uniform(L, u), false);
      const pt = { L, u, Pavg: res.Pavg, E: res.E, J: objective(res, gamma) };
      pts.push(pt);
      if (!best || pt.J > best.J) best = pt;
    }
    // yerel iyileştirme (küçülen adım)
    let step = 0.08;
    for (let it = 0; it < 250; it++) {
      const L = best.L.map((v) => Math.max(1e-4, v + (r() - 0.5) * 2 * step));
      const s = L.reduce((a, b) => a + b, 0);
      const Ln = L.map((v) => v / s);
      const u = clamp01(best.u + (r() - 0.5) * 2 * step);
      const res = simulate(p, uniform(Ln, u), false);
      const J = objective(res, gamma);
      if (J > best.J) best = { L: Ln, u, Pavg: res.Pavg, E: res.E, J };
      if (it % 50 === 49) step *= 0.6;
    }
    // Pareto (P̄ ↑, E ↑)
    const sorted = pts.slice().sort((a, b) => b.Pavg - a.Pavg);
    const pareto = []; let maxE = -Infinity;
    sorted.forEach((q) => { if (q.E > maxE) { pareto.push(q); maxE = q.E; } });
    return { pts, best, pareto };
  }

  /* Kuşağa göre kişiselleştirilmiş strateji: koordinat iniş (blok) */
  function optimizePersonal(p, base, opts) {
    const gamma = opts.gamma ?? 2, r = rng((opts.seed || 2026) + 7);
    const strat = uniform(base.L, base.u);
    let cur = simulate(p, strat, false), J = objective(cur, gamma);
    const w = normW(p);
    for (let round = 0; round < 3; round++) {
      GENS.forEach((g) => {
        if (w[g] <= 0) return;
        for (let i = 0; i < 160; i++) {
          const cand = i < 80 ? dirichlet(r) : strat.L[g].map((v) => Math.max(1e-4, v + (r() - 0.5) * 0.2));
          const s = cand.reduce((a, b) => a + b, 0);
          const old = strat.L[g];
          strat.L[g] = cand.map((v) => v / s);
          const res = simulate(p, strat, false), Jn = objective(res, gamma);
          if (Jn > J) { J = Jn; cur = res; } else strat.L[g] = old;
        }
      });
    }
    return { strat, res: cur, J };
  }

  /* ---------------- Duyarlılık ---------------- */
  const GLOBAL_KEYS = ["aM", "bM", "eta", "kappa", "aI", "bI", "psi", "aK", "bK", "chi"];

  function perturb(p, pct, r) {
    const q = clone(p);
    const f = () => 1 + (r() * 2 - 1) * pct;
    GLOBAL_KEYS.forEach((k) => (q[k] = q[k] * f()));
    if (q.eta + q.kappa > 0.9) { const s = 0.9 / (q.eta + q.kappa); q.eta *= s; q.kappa *= s; }
    GENS.forEach((g) => {
      q.beta[g] = q.beta[g].map((b) => clamp01(b * f()));
      q.delta[g] = clamp01(q.delta[g] * f());
    });
    return q;
  }

  /* Monte Carlo sıra kabul edilebilirliği (SMAA benzeri) */
  function monteCarlo(p, wCrit, opts) {
    const N = opts.N || 300, pct = opts.pct ?? 0.2, r = rng(opts.seed || 99);
    const m = SCENARIOS.length;
    const acc = SCENARIOS.map(() => new Array(m).fill(0));
    const Pdist = SCENARIOS.map(() => []);
    for (let n = 0; n < N; n++) {
      const q = perturb(p, pct, r);
      const ev = evaluateScenarios(q, wCrit);
      ev.topsis.rank.forEach((rk, i) => acc[i][rk - 1]++);
      ev.res.forEach((rs, i) => Pdist[i].push(rs.Pavg));
    }
    return { acc: acc.map((row) => row.map((c) => c / N)), Pdist, N };
  }

  /* Tek-faktör (OAT) tornado: hedef senaryonun P̄ değerine etkisi */
  function tornado(p, scen, pct) {
    const s = uniform(scen.L, scen.u);
    const base = simulate(p, s, false).Pavg;
    return GLOBAL_KEYS.map((k) => {
      const lo = clone(p), hi = clone(p);
      lo[k] *= 1 - pct; hi[k] *= 1 + pct;
      return { k, lo: simulate(lo, s, false).Pavg - base, hi: simulate(hi, s, false).Pavg - base };
    }).sort((a, b) => Math.max(Math.abs(b.lo), Math.abs(b.hi)) - Math.max(Math.abs(a.lo), Math.abs(a.hi)));
  }

  /* ---------------- Geçerlilik ve güvenilirlik test paketi ----------------
   * Barlas (1996) yapı-davranış testleri + sayısal ve ÇKKV güvenilirlik testleri.
   * Her test: { grp, ad, durum: "geçti"|"kaldı"|"veri bekliyor", detay }      */
  function validationSuite(p0, wCrit) {
    const out = [];
    const push = (grp, ad, ok, detay) => out.push({ grp, ad, durum: ok === null ? "veri bekliyor" : ok ? "geçti" : "kaldı", detay });
    const base = SCENARIOS[4];
    const sB = uniform(base.L, base.u);
    const r = rng(4242);

    // 1) Sınır tutarlılığı: rastgele 300 parametre/strateji → tüm stoklar [0,1]
    let bad = 0, minv = 1, maxv = 0;
    for (let i = 0; i < 300; i++) {
      const q = perturb(p0, 0.5, r);
      const res = simulate(q, uniform(dirichlet(r), r()), true);
      const all = [].concat(...res.trace.M, ...res.trace.I, res.trace.K);
      all.forEach((v) => { if (!(v >= 0 && v <= 1) || !isFinite(v)) bad++; minv = Math.min(minv, v); maxv = Math.max(maxv, v); });
    }
    push("Yapı", "Sınır tutarlılığı (300 rastgele senaryo, ±%50 parametre)", bad === 0,
      `Tüm stoklar [${minv.toFixed(3)}, ${maxv.toFixed(3)}] aralığında; ihlal: ${bad}`);

    // 2) Uç koşul: girdi akışları sıfır → stoklar monoton söner
    const q0 = clone(p0); q0.aM = 0; q0.aI = 0; q0.aK = 0;
    const r0 = simulate(q0, sB, true);
    const mono = (arr) => arr.every((v, i) => i === 0 || v <= arr[i - 1] + 1e-12);
    const okDecay = r0.trace.M.every(mono) && r0.trace.I.every(mono) && mono(r0.trace.K);
    const expM = p0.M0 * Math.exp(-p0.bM * p0.T);
    push("Uç koşul", "Girdi akışları sıfır → tüm stoklar monoton söner", okDecay && Math.abs(r0.M - expM) < 0.01,
      `M̄(T)=${r0.M.toFixed(4)}; analitik M0·e^(−b_M·T)=${expM.toFixed(4)}`);

    // 3) Uç koşul: liderlik uyumu sıfır (β=0) → motivasyon taban senaryonun altına düşer
    const qb = clone(p0); GENS.forEach((g) => (qb.beta[g] = [0, 0, 0, 0]));
    const rb = simulate(qb, sB, false), rBase = simulate(p0, sB, false);
    push("Uç koşul", "Liderlik uyumu sıfır (β=0) → motivasyon belirgin düşer", rb.M < rBase.M - 0.05,
      `M̄: ${rBase.M.toFixed(3)} → ${rb.M.toFixed(3)}`);

    // 4) Simetri: tüm kuşaklar özdeş → denge E = 1
    const qs = clone(p0); GENS.forEach((g) => { qs.beta[g] = p0.beta.Y.slice(); qs.delta[g] = p0.delta.Y; });
    const rs = simulate(qs, sB, false);
    push("Yapı", "Simetri: özdeş kuşaklar → özdeş yörüngeler (E=1)", Math.abs(rs.E - 1) < 1e-9,
      `E=${rs.E.toFixed(10)}`);

    // 5) Ölçek değişmezliği: w ×3 → sonuç değişmez
    const qw = clone(p0); GENS.forEach((g) => (qw.w[g] *= 3));
    const rw = simulate(qw, sB, false);
    push("Yapı", "Ölçek değişmezliği: işgücü ağırlıkları ×3", Math.abs(rw.Pavg - rBase.Pavg) < 1e-12,
      `|ΔP̄| = ${Math.abs(rw.Pavg - rBase.Pavg).toExponential(1)}`);

    // 6) Davranış işareti (monotonluk) testleri
    const sign = (mod, key, dir) => {
      const q = clone(p0); mod(q); const rr = simulate(q, sB, false);
      return { ok: dir > 0 ? rr[key] > rBase[key] : rr[key] < rBase[key], a: rBase[key], b: rr[key] };
    };
    const m1 = sign((q) => GENS.forEach((g) => (q.beta[g] = q.beta[g].map((b) => Math.min(1, b + 0.1)))), "M", +1);
    push("İşaret", "Uyum β ↑ ⇒ motivasyon ↑", m1.ok, `${m1.a.toFixed(3)} → ${m1.b.toFixed(3)}`);
    const m2 = sign((q) => (q.psi = q.psi * 2), "I", +1);
    push("İşaret", "Katılımın iletişime etkisi ψ ↑ ⇒ iletişim ↑", m2.ok, `${m2.a.toFixed(3)} → ${m2.b.toFixed(3)}`);
    const m2b = sign((q) => (q.chi = q.chi * 2), "K", +1);
    push("İşaret", "Dönüşümcü+katılımcı etkisi χ ↑ ⇒ yenilik ↑", m2b.ok, `${m2b.a.toFixed(3)} → ${m2b.b.toFixed(3)}`);
    const m3 = sign((q) => (q.bM = q.bM * 1.5), "M", -1);
    push("İşaret", "Motivasyon aşınması b_M ↑ ⇒ motivasyon ↓", m3.ok, `${m3.a.toFixed(3)} → ${m3.b.toFixed(3)}`);
    const sKat = simulate(p0, uniform([0.1, 0.1, 0.7, 0.1], base.u), false);
    const sEtk = simulate(p0, uniform([0.1, 0.7, 0.1, 0.1], base.u), false);
    push("İşaret", "Katılımcı ağırlık ⇒ iletişim ↑, karar hızı ↓ (bilinen ödünleşim)", sKat.I > sEtk.I && sKat.V < sEtk.V,
      `KAT: I=${sKat.I.toFixed(3)}, V=${sKat.V.toFixed(3)} | ETK: I=${sEtk.I.toFixed(3)}, V=${sEtk.V.toFixed(3)}`);

    // 7) Sayısal yakınsama: dt yarıya/dörtte bire
    const qd = clone(p0); qd.dt = p0.dt / 4;
    const rd = simulate(qd, sB, false);
    const rel = Math.abs(rd.Pavg - rBase.Pavg) / rd.Pavg;
    push("Sayısal", `RK4 yakınsaması (dt=${p0.dt} vs ${qd.dt})`, rel < 0.005, `Göreli fark: %${(rel * 100).toFixed(3)}`);

    // 8) Yeniden üretilebilirlik: sabit tohum → aynı optimum
    const oa = optimizeUniform(p0, { N: 150, seed: 11 }), ob = optimizeUniform(p0, { N: 150, seed: 11 });
    push("Sayısal", "Yeniden üretilebilirlik (sabit tohum → özdeş optimum)", oa.best.J === ob.best.J,
      `J* = ${oa.best.J.toFixed(6)} (iki bağımsız koşu)`);

    // 9) AHP tutarlılığı
    if (wCrit && wCrit.CR !== undefined) {
      push("ÇKKV", "AHP tutarlılık oranı CR < 0,10", wCrit.CR < 0.1, `CR = ${wCrit.CR.toFixed(3)}`);
    }
    const w = wCrit ? wCrit.w : ahp(defaultAHP()).w;

    // 10) TOPSIS sıra tersinmesi: en kötü alternatif çıkarılınca diğerlerinin sırası
    const ev = evaluateScenarios(p0, w);
    const worst = ev.topsis.order[ev.topsis.order.length - 1];
    const keep = SCENARIOS.map((s, i) => i).filter((i) => i !== worst);
    const t2 = topsis(keep.map((i) => ev.X[i]), w);
    const before = ev.topsis.order.filter((i) => i !== worst);
    const after = t2.order.map((j) => keep[j]);
    const same = before.every((v, i) => v === after[i]);
    push("ÇKKV", "TOPSIS sıra tersinmesi (en zayıf alternatif çıkarıldığında)", same,
      `Önce: ${before.map((i) => SCENARIOS[i].id).join(" ≻ ")} | Sonra: ${after.map((i) => SCENARIOS[i].id).join(" ≻ ")}`);

    // 11) Ağırlık sağlamlığı: AHP ağırlıkları ±%25 rastgele, 200 kez → lider değişiyor mu?
    let keepTop = 0; const top = ev.topsis.order[0];
    for (let i = 0; i < 200; i++) {
      const wp = w.map((x) => x * (1 + (r() * 2 - 1) * 0.25)); const sw = wp.reduce((a, b) => a + b, 0);
      if (topsis(ev.X, wp.map((x) => x / sw)).order[0] === top) keepTop++;
    }
    push("ÇKKV", "Ağırlık sağlamlığı (±%25, 200 çekiliş): lider alternatif korunuyor mu?", keepTop / 200 >= 0.8,
      `${SCENARIOS[top].id} liderliği çekilişlerin %${((keepTop / 200) * 100).toFixed(0)}'inde korundu`);

    // 12) Davranış yeniden üretimi (ampirik) — saha verisi gerekli
    push("Ampirik", "Davranış yeniden üretimi: model–saha verisi uyumu (R², Theil U)", null,
      "Saha verisi (çok kuşaklı örgüt anketi + panel) makale aşamasında toplanacak");
    push("Ampirik", "Parametre kalibrasyonu (β, δ) ve yapı geçerliliği (SEM/PLS)", null,
      "Ölçekler: liderlik tarzı, iş motivasyonu, iletişim doyumu; kuşak bazlı tahmin");
    return out;
  }

  global.KDYM = {
    validationSuite,
    GENS, STYLES, STYLE_SHORT, SCENARIOS, CRITERIA, GLOBAL_KEYS,
    defaultParams, simulate, fit, uniform, ahp, defaultAHP, fillReciprocal, topsis,
    evaluateScenarios, optimizeUniform, optimizePersonal, monteCarlo, tornado, clone
  };
})(typeof window !== "undefined" ? window : globalThis);
