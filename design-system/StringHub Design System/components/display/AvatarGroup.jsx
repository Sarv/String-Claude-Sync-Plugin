import React from "react";
import { Avatar } from "./Avatar.jsx";
export function AvatarGroup({ names = [], max = 3, size = "sm" }) {
  const shown = names.slice(0, max), rest = names.length - shown.length;
  return <span className="avatar-group">{shown.map((n, i) => <Avatar key={i} name={n} size={size} />)}
    {rest > 0 ? <span className={"avatar more" + (size !== "md" ? " avatar-" + size : "")}>+{rest}</span> : null}</span>;
}
