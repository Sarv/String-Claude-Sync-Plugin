import React from "react";
/** Settings-style split row: label + hint left (5), field right (7). Wrap rows in <div className="form-rows">. */
export function FormRow({ label, hint, htmlFor, children }) {
  return <div className="form-row"><div className="form-row-label">{htmlFor ? <label className="label" htmlFor={htmlFor}>{label}</label> : <span className="label">{label}</span>}{hint ? <p className="hint">{hint}</p> : null}</div>
    <div className="form-row-field">{children}</div></div>;
}
