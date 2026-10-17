import React from "react";
/** Desk / project / workspace card. add=true renders the dashed create card. */
export function EntityCard({ icon = "support", color, title, description, stats = [], add, href = "#", onClick, onMore }) {
  if (add) return <a className="entity-card add" href={href} onClick={onClick}><i className="bx bx-plus icon-24" aria-hidden="true"></i><span>{title}</span></a>;
  return <a className="entity-card" href={href} onClick={onClick}>
    <div className="ec-head"><span className="ec-ico" style={color ? { "--_c": color } : undefined}><i className={"bx bx-" + icon + " icon-20"} aria-hidden="true"></i></span>
      <div className="ec-text"><div className="ec-title">{title}</div>{description ? <div className="ec-desc">{description}</div> : null}</div>
      {onMore ? <button className="icon-btn sm" aria-label="More" onClick={(e) => { e.preventDefault(); onMore(e); }}><i className="bx bx-dots-horizontal-rounded icon-17" aria-hidden="true"></i></button> : null}</div>
    {stats.length ? <div className="ec-foot">{stats.map((s, i) => <span className="ec-stat" key={i}><i className={"bx bx-" + s.icon + " icon-14"} aria-hidden="true"></i> {s.label}</span>)}</div> : null}
  </a>;
}
