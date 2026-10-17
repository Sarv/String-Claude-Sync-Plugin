import React from "react";
/** Company cell: 22px chip-tinted initials square + name. Pass no name to render an em dash. */
export function OrgCell({ initials, name }) {
  if (!name) return <span className="muted">—</span>;
  return <div className="org-cell"><span className="co-chip">{initials}</span><span>{name}</span></div>;
}
