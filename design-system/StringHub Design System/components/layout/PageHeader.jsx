import React from "react";
/** Breadcrumb + title (+count) + subtitle + actions. bar=true = white strip with violet hairline. */
export function PageHeader({ breadcrumb, title, count, subtitle, actions, bar = true, leading, meta }) {
  const heading = <div className="page-heading">
    {breadcrumb ? <ol className="breadcrumb">{breadcrumb.map((b, i) => i === breadcrumb.length - 1 ? <li key={i} aria-current="page">{b.label ?? b}</li> : <li key={i}><a href="#" onClick={(e) => { e.preventDefault(); b.onClick && b.onClick(); }}>{b.label ?? b}</a></li>)}</ol> : null}
    <h1 className="page-title">{title}{count != null ? <span className="count-badge">{count}</span> : null}</h1>
    {subtitle ? <p className="page-sub">{subtitle}</p> : null}{meta}</div>;
  return <div className={"page-header" + (bar ? " bar" : "")}>{leading ? <div className="cell-main">{leading}{heading}</div> : heading}{actions ? <div className="page-actions">{actions}</div> : null}</div>;
}
