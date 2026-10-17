import React from "react";
export function SettingsCard({ title, description, flush, danger, children }) {
  return <div className={"settings-card" + (flush ? " flush" : "") + (danger ? " danger" : "")}>
    <div className="settings-card-head"><h3>{title}</h3>{description ? <p>{description}</p> : null}</div>{children}</div>;
}
