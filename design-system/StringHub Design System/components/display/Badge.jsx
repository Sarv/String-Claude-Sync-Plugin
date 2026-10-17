import React from "react";
/** Metadata label (.badge). */
export function Badge({ tone, children }) {
  return <span className={"badge" + (tone ? " " + tone : "")}>{children}</span>;
}
