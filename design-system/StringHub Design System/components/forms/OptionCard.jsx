import React from "react";
/** Radio/checkbox row card with hint; the chosen one may reveal an extra field. */
export function OptionCard({ type = "radio", name, title, badge, hint, checked, onChange, extra }) {
  return <label className={"opt-card" + (checked ? " selected" : "")}>
    <input type={type} className={type === "radio" ? "radio" : "check"} name={name} checked={!!checked} onChange={onChange} />
    <span className="opt-body"><span className="opt-title">{title}{badge ? <> <span className="badge brand">{badge}</span></> : null}</span>{hint ? <span className="hint">{hint}</span> : null}
      {checked && extra ? <span className="opt-extra">{extra}</span> : null}</span></label>;
}
