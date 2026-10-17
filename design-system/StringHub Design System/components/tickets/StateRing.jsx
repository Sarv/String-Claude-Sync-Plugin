import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
function ring(state, color, size) {
  const c = color || STATE_COLORS[state] || "#757575";
  const done = state === "resolved" || state === "closed";
  return <svg className={"tk-state" + (done ? " done" : "")} viewBox="0 0 26 26" style={{ "--c": c, width: size, height: size }} aria-hidden="true"><circle className="trk" r="9.75" cx="13" cy="13" /><circle className="arc" r="9.75" cx="13" cy="13" /><circle className="dot" r="4.5" cx="13" cy="13" /></svg>;
}
/** Ticket state glyph (TicketStatusIcon): half ring for open / in-progress / on-hold, full ring for resolved / closed. color overrides the state default. */
export function StateRing({ state = "open", color, size = 16 }) { return ring(state, color, size); }
