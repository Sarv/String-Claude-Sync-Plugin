import React from "react";
/** Last-column row action (gear) that opens the row's Edit / Delete menu. */
export function RowSettingsButton({ label = "Actions", onClick }) {
  return <button type="button" className="row-settings" aria-label={label} onClick={onClick}><i className="bx bx-cog" aria-hidden="true"></i></button>;
}
