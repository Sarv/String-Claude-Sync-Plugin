import React from "react";
export function Breadcrumb({ items = [] }) {
  return <ol className="breadcrumb">{items.map((it, i) => i === items.length - 1 ? <li key={i} aria-current="page">{it.label}</li> : <li key={i}><a href={it.href || "#"} onClick={it.onClick}>{it.label}</a></li>)}</ol>;
}
