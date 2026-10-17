import React from "react";
export function SettingRow({ title, description, children }) {
  return <div className="setting-row"><div><div className="sr-title">{title}</div>{description ? <div className="sr-desc">{description}</div> : null}</div>{children}</div>;
}
