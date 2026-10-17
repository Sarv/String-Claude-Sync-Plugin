import React from "react";
/** Minimal column sankey. nodes: [{id,label,col,value}], links: [{from,to,value}]. */
export function Sankey({ nodes = [], links = [], width = 900, height = 280 }) {
  const cols = Math.max(...nodes.map((n) => n.col)) + 1, gap = 10, nw = 12, pad = 8;
  const colTotals = []; nodes.forEach((n) => colTotals[n.col] = (colTotals[n.col] || 0) + n.value);
  const perCol = []; nodes.forEach((n) => perCol[n.col] = (perCol[n.col] || 0) + 1);
  const k = Math.min(...colTotals.map((t, c) => (height - 2 * pad - gap * (perCol[c] - 1)) / t));
  const pos = {}, yCur = [];
  nodes.forEach((n) => { const y = yCur[n.col] ?? pad; const x = pad + (n.col * (width - 2 * pad - nw)) / (cols - 1); pos[n.id] = { x, y, h: n.value * k, out: y, in: y }; yCur[n.col] = y + n.value * k + gap; });
  return <svg className="sankey" viewBox={"0 0 " + width + " " + height} role="img" aria-label="State flow">
    {links.map((l, i) => { const a = pos[l.from], b = pos[l.to], t = l.value * k, y1 = a.out + t / 2, y2 = b.in + t / 2; a.out += t; b.in += t; const x1 = a.x + nw, x2 = b.x, mx = (x1 + x2) / 2;
      return <path key={i} className="sk-link" d={"M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2} strokeWidth={t}><title>{l.from + " → " + l.to + ": " + l.value}</title></path>; })}
    {nodes.map((n) => { const p = pos[n.id], last = n.col === cols - 1; return <g key={n.id}><rect className="sk-node" x={p.x} y={p.y} width={nw} height={p.h} rx="1"><title>{n.label + ": " + n.value}</title></rect>
      <text className="sk-label" x={last ? p.x - 6 : p.x + nw + 6} y={p.y + p.h / 2} textAnchor={last ? "end" : "start"}>{n.label} <tspan className="sk-n">{n.value}</tspan></text></g>; })}
  </svg>;
}
