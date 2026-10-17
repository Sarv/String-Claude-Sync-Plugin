import React from "react";
import { Avatar } from "../display/Avatar.jsx";
/** Primary cell: avatar + title + sub line. */
export function CellMain({ name, title, sub, avatar = true, tone }) {
  return <div className="cell-main">{avatar ? <Avatar name={name || title} tone={tone} /> : null}
    <div className="cell-text"><div className="cell-title">{title ?? name}</div>{sub ? <div className="cell-sub">{sub}</div> : null}</div></div>;
}
