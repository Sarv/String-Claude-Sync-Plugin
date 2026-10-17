import React from "react";
export function StatMini({ tone, label, value, sub }) {
  return <div className={"stat-mini" + (tone ? " " + tone : "")}><span className="sm-label">{label}</span><span className="sm-value">{value}</span>{sub ? <span className="sm-sub">{sub}</span> : null}</div>;
}
