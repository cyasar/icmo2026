/* Ağır hesaplar (optimizasyon, Monte Carlo, test paketi) arayüzü dondurmasın diye */
importScripts("model.js?v=20261114c");
self.onmessage = function (e) {
  const m = e.data, K = self.KDYM;
  try {
    if (m.cmd === "opt") {
      const o = K.optimizeUniform(m.p, { N: m.N || 900, gamma: m.gamma });
      const pe = K.optimizePersonal(m.p, o.best, { gamma: m.gamma });
      self.postMessage({ id: m.id, ok: true, data: {
        pts: o.pts.map((q) => ({ x: q.E, y: q.Pavg })), pareto: o.pareto.map((q) => ({ x: q.E, y: q.Pavg })),
        best: o.best, personal: { L: pe.strat.L, u: pe.strat.u, Pavg: pe.res.Pavg, E: pe.res.E, J: pe.J }
      } });
    } else if (m.cmd === "mc") {
      const mc = K.monteCarlo(m.p, m.w, { N: m.N || 300, pct: m.pct });
      const tor = K.tornado(m.p, K.SCENARIOS[4], m.pct);
      self.postMessage({ id: m.id, ok: true, data: { mc, tor } });
    } else if (m.cmd === "val") {
      self.postMessage({ id: m.id, ok: true, data: K.validationSuite(m.p, m.ahp) });
    }
  } catch (err) { self.postMessage({ id: m.id, ok: false, error: String(err) }); }
};
