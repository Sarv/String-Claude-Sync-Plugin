import React from "react";
/** Rich hover card (.tt-host + .tt-card), shows after a 1s dwell. */
export function HoverCard({ trigger, title, rows = [], description }) {
  return <span className="tt-host">{trigger}<span className="tt-card" role="tooltip">
    {title ? <div className="tt-title">{title}</div> : null}
    {rows.map(([k, v], i) => <div className="tt-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>)}
    {description ? <div className="tt-desc">{description}</div> : null}</span></span>;
}
