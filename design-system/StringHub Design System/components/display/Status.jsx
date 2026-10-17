import React from "react";
/** Live state chip (.status): 24px, 12% tint + pulse dot. */
export function Status({ tone = "active", children, pulse = true }) {
  return <span className={"status" + (tone !== "active" ? " " + tone : "")}>{pulse ? <span className="pulse"></span> : null} {children}</span>;
}
