import React from "react";
/** Active / Deleted segmented toggle; the selected option is solid brand with white text. size "lg" = 40px (mobile / standalone). */
export function StatusToggle({ value = "active", options = [{ value: "active", label: "Active" }, { value: "deleted", label: "Deleted" }], size, onChange }) {
  return <div className={"status-toggle" + (size === "lg" ? " lg" : "")} role="group" aria-label="Show">
    {options.map((o) => <button key={o.value} type="button" className={o.value === value ? "active" : ""} aria-pressed={o.value === value} onClick={() => onChange && onChange(o.value)}>{o.label}</button>)}
  </div>;
}
