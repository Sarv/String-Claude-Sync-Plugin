import React from "react";
/** Table ratio column: value + n + 3px bar; greyed when n < minN. */
export function RatioCell({ value, n, tone = "success", minN = 5 }) {
  const low = n < minN;
  return <div className={"ratio-cell" + (low ? " muted" : "")}><span className="ratio-val">{value}%</span><span className="ratio-n">{low ? "(" + n + ")" : "n=" + n}</span>
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span className={"progress-fill " + tone} style={{ width: value + "%" }}></span></div></div>;
}
