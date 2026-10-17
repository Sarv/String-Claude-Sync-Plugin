import React from "react";
const hash = (s) => { let h = 0; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/** Dashboard stringAvatar: deep tone per person + ONE white initial. */
export function Avatar({ name = "", initials, size = "md", tone, ring, square, className }) {
  const t = tone ?? ((hash(name) % 6) + 1);
  const toneCls = t === "tint" ? "tint" : t === "none" ? "" : "g" + t;
  const txt = initials ?? (name.trim().charAt(0) || "?").toUpperCase();
  return <span className={["avatar", size !== "md" && "avatar-" + size, toneCls, ring && "ring", square && "avatar-square", className].filter(Boolean).join(" ")} title={name || undefined}>{txt}</span>;
}
