import React from "react";
/** 36px grey square with violet icon (header), .sm = 28px for row actions. */
export function IconButton({ icon, label, size = "md", className, ...rest }) {
  return <button type="button" className={["icon-btn", size === "sm" && "sm", className].filter(Boolean).join(" ")} aria-label={label} {...rest}>
    <i className={"bx bx-" + icon + (size === "sm" ? " icon-16" : " icon-20")} aria-hidden="true"></i></button>;
}
