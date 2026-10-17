import React from "react";
export function Radio({ label, ...rest }) {
  const r = <input type="radio" className="radio" {...rest} />;
  return label ? <label className="row-tight">{r} {label}</label> : r;
}
