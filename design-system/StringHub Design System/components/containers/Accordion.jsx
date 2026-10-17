import React from "react";
export function Accordion({ items = [] }) {
  return <div className="accordion">{items.map((it, i) => <details key={i} open={it.open}><summary>{it.title}</summary><div className="accordion-body">{it.body}</div></details>)}</div>;
}
