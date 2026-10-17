import React from "react";
const TONE_ICON = { info: "info-circle", success: "check", warning: "error", danger: "error-circle", brand: "bot" };
/** One-off result of an action. Stack them in <div className="toast-stack"> (bottom-right; add "inline" for previews). */
export function Toast({ tone = "success", title, message, actions = [], onDismiss, sticky }) {
  return <div className={"toast " + tone + (sticky ? " sticky" : "")} role={tone === "danger" ? "alert" : "status"}>
    <span className="toast-ico"><i className={"bx bx-" + TONE_ICON[tone] + " icon-16"} aria-hidden="true"></i></span>
    <div className="toast-body"><div className="toast-title">{title}</div>{message ? <div className="toast-msg">{message}</div> : null}
      {actions.length ? <div className="toast-actions">{actions.map((a, i) => <button key={i} onClick={a.onClick}>{a.label}</button>)}</div> : null}</div>
    <button className="btn-close" aria-label="Dismiss" onClick={onDismiss}><i className="bx bx-x icon-14" aria-hidden="true"></i></button>
  </div>;
}
