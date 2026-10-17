import React from "react";
const TONE_ICON = { info: "info-circle", success: "check", warning: "error", danger: "error-circle", brand: "bot" };
/** A condition that persists (trial ending, sync failed). */
export function Banner({ tone = "info", icon, title, children, actions, onDismiss, page }) {
  return <div className={"banner " + tone + (page ? " page" : "")} role={tone === "danger" ? "alert" : undefined}>
    <i className={"bx bx-" + (icon || TONE_ICON[tone]) + " icon-16"} aria-hidden="true"></i>
    <div className="banner-body">{title ? <span className="banner-title">{title}</span> : null}{title ? <span>{children}</span> : children}
      {actions ? <div className="banner-actions">{actions}</div> : null}</div>
    {onDismiss ? <button className="btn-close" aria-label="Dismiss" onClick={onDismiss}><i className="bx bx-x icon-14" aria-hidden="true"></i></button> : null}
  </div>;
}
