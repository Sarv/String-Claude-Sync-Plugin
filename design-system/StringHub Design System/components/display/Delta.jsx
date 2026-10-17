import React from "react";
/** Trend pill next to a number. */
export function Delta({ dir = "up", children }) { return <span className={"delta " + dir}>{children}</span>; }
