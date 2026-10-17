import React from "react";
/** Two-line date cell: date (12.5px) over time (11px muted). */
export function WhenCell({ date, time }) {
  return <div className="when-cell"><b>{date}</b>{time ? <span>{time}</span> : null}</div>;
}
