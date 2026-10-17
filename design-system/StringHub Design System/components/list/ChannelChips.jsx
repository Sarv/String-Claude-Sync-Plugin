import React from "react";
/** Grey channel chips; shows the first `max` then "+N". */
export function ChannelChips({ items = [], max = 2 }) {
  if (!items.length) return <span>—</span>;
  return <div className="chip-row">{items.slice(0, max).map((c) => <span key={c} className="channel-chip">{c}</span>)}{items.length > max ? <span className="channel-chip">+{items.length - max}</span> : null}</div>;
}
