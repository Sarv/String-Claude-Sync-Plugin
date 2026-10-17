import React from "react";
const ICONS = { danger: "error-circle", warning: "error", info: "info-circle", success: "check-circle" };
/** Big-icon centred confirmation with two full-width buttons. */
export function ConfirmDialog({ open, tone = "warning", title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  const v = tone === "danger" ? "danger" : tone === "warning" ? "warning" : "primary";
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel && onCancel()}>
    <div className={"confirm-dialog" + (tone !== "warning" ? " " + tone : "")} role="alertdialog" aria-modal="true">
      <div className="confirm-body"><i className={"bx bx-" + ICONS[tone] + " icon-52"} aria-hidden="true"></i><h4>{title}</h4>{message ? <p>{message}</p> : null}</div>
      <div className="confirm-actions"><button className="btn btn-confirm-cancel" onClick={onCancel}>{cancelLabel}</button><button className={"btn btn-" + v} onClick={onConfirm}>{confirmLabel}</button></div>
    </div></div>;
}
