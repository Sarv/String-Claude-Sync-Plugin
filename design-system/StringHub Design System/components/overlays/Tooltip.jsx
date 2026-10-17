import React from "react";
/** CSS-only label tooltip (data-tip) on any element. Not for checkbox/radio/toggle. */
export function Tooltip({ tip, pos, children }) {
  return <span data-tip={tip} data-tip-pos={pos} style={{ display: "inline-flex" }}>{children}</span>;
}
