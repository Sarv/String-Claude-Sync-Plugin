import React from "react";
/** Every dashboard widget. state: loading | empty | error. */
export function DashCard({ title, live, info, sub, actions, state, emptyText = "No data in this range.", errorText = "This section could not be calculated.", onRetry, children }) {
  return <div className="dash-card">
    <div className="dash-card-head"><h3>{title}</h3>{live ? <span className="dash-live">NOW</span> : null}
      {info ? <span className="dash-info" title={info}><i className="bx bx-info-circle" style={{ fontSize: 14 }} aria-hidden="true"></i></span> : null}
      {actions ? <div className="dash-actions">{actions}</div> : null}</div>
    {sub ? <div className="dash-sub">{sub}</div> : null}
    <div className="dash-body">{state === "loading" ? <span className="skeleton block" style={{ height: 110 }}></span> : state === "empty" ? <div className="dash-state">{emptyText}</div> :
      state === "error" ? <div className="dash-state error">{errorText}<button className="btn btn-secondary btn-sm" onClick={onRetry}><i className="bx bx-refresh" style={{ fontSize: 15 }} aria-hidden="true"></i> Try again</button></div> : children}</div>
  </div>;
}
