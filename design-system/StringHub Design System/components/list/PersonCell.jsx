import React from "react";
/** Name cell of a contact-style table: 32px soft initials circle + name (13.5/500) + optional sub line. */
export function PersonCell({ initials, name, sub }) {
  return <div className="person-cell"><span className="avatar-soft">{initials}</span><div className="pc-text"><span className="pc-name" title={name}>{name}</span>{sub ? <span className="pc-sub">{sub}</span> : null}</div></div>;
}
