import React from "react";
export function Checkbox({ label, ...rest }) {
  const box = <input type="checkbox" className="check" {...rest} />;
  return label ? <label className="row-tight">{box} {label}</label> : box;
}
