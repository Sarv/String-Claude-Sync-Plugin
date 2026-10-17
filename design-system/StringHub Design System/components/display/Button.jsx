import React from "react";
const cx = (...a) => a.filter(Boolean).join(" ");
/** StringHub button. variant maps to .btn-<variant>. */
export function Button({ variant = "custom-primary", size, icon, iconOnly, loading, children, className, type = "button", disabled, ...rest }) {
  const is = size === "sm" ? 14 : 16;
  return (
    <button type={type} className={cx("btn", "btn-" + variant, size === "sm" && "btn-sm", size === "lg" && "btn-lg", iconOnly && "btn-icon", className)}
      disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <i className={"bx bx-loader-alt bx-spin icon-" + is} aria-hidden="true"></i> : icon ? <i className={"bx bx-" + icon + " icon-" + is} aria-hidden="true"></i> : null}
      {iconOnly ? null : children}
    </button>
  );
}
