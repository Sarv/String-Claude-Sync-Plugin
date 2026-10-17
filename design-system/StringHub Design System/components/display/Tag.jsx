import React from "react";
/** Outlined colour tag. */
export function Tag({ tone, children }) {
  return <span className={"tag" + (tone ? " " + tone : "")}>{children}</span>;
}
