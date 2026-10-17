import React from "react";
/** Boxicons 2.1.4 glyph. name: "search" | "bxs-flag" | "bxl-whatsapp". */
export function Icon({ name, size, solid, className, style, ...rest }) {
  const full = /^bx[sl]?-/.test(name) ? name : (solid ? "bxs-" : "bx-") + name;
  return <i className={["bx", full, size ? "icon-" + size : "", className].filter(Boolean).join(" ")} style={style} aria-hidden="true" {...rest}></i>;
}
