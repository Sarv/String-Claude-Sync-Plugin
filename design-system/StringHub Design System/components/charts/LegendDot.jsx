import React from "react";
export function LegendDot({ color = "var(--chart-1)", children }) { return <span className="legend-dot" style={{ "--swatch": color }}>{children}</span>; }
