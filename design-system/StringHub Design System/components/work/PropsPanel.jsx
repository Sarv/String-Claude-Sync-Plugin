import React from "react";
/** Ticket properties sidebar. sections: [{title, extra, rows:[{label, value, top, required, invalid, error}], link}] */
export function PropsPanel({ sections = [], card = true }) {
  return <aside className={"props-panel" + (card ? " card" : "")} aria-label="Properties">{sections.map((s, i) => <details className="props-section" open={s.open !== false} key={i}>
    <summary className="props-head">{s.title} {s.extra ? <span className="ph-extra">{s.extra}</span> : null}<i className="bx bx-chevron-down icon-20" aria-hidden="true"></i></summary>
    <div className="props-rows">{(s.rows || []).map((r, j) => r.sla ? <div className="prop-row sla-row" key={j}><span><span className="sla-target">{r.label}</span><br /><span className={"sla-due" + (r.state === "breached" ? " breached" : "")}>{r.due}</span></span><span className={"sla-chip " + (r.state || "")}>{r.value}</span></div> :
      <div key={j} className={["prop-row", r.required && "required", r.invalid && "invalid", r.top && "top"].filter(Boolean).join(" ")}><span className="prop-label">{r.label}</span>
        <span className="prop-value">{r.value ?? <span className="prop-empty">Not set</span>}{r.error ? <span className="prop-error"><i className="bx bx-error-circle icon-13" aria-hidden="true"></i> {r.error}</span> : null}</span></div>)}</div>
    {s.link ? <a className="props-link" href="#" onClick={(e) => e.preventDefault()}>{s.link}</a> : null}</details>)}</aside>;
}
