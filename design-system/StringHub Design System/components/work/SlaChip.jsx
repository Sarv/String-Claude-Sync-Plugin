import React from "react";
export function SlaChip({ state, children }) { return <span className={"sla-chip" + (state ? " " + state : "")}>{children}</span>; }
