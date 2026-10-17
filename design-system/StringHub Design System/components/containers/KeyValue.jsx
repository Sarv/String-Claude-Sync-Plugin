import React from "react";
export function KeyValue({ items = [] }) {
  return <dl className="kv">{items.map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>;
}
