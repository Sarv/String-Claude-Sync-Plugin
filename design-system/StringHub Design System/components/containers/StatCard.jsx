import React from "react";
export function StatCard({ label, icon, value, delta, deltaDir = "up", sub }) {
  return <div className="stat-card">
    <span className="sc-label">{icon ? <><i className={"bx bx-" + icon + " icon-14"} aria-hidden="true"></i> </> : null}{label}</span>
    <span className="sc-value">{value}</span>
    {delta || sub ? <span className="sc-sub">{delta ? <span className={"delta " + deltaDir}>{delta}</span> : null}{sub}</span> : null}
  </div>;
}
