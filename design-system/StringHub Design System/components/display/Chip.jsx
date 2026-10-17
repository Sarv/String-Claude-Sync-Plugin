import React from "react";
/** Neutral lilac chip for channel / source. */
export function Chip({ tone, icon, children }) {
  return <span className={"chip" + (tone ? " " + tone : "")}>{icon ? <i className={"bx bx" + (icon.startsWith("bxl-") ? "" : "-") + icon.replace(/^bx-/, "") + " icon-12"} aria-hidden="true"></i> : null}{icon ? " " : null}{children}</span>;
}
