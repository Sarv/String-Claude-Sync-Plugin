import React from "react";
/** Icon or text prefix + borderless input in one control. search=true for toolbar width. */
export function InputGroup({ icon, prefix, search, className, ...inputProps }) {
  return <div className={["input-group", search && "input-search", className].filter(Boolean).join(" ")}>
    {icon ? <i className={"bx bx-" + icon + " icon-16"} aria-hidden="true"></i> : null}{prefix ? <span>{prefix}</span> : null}
    <input {...inputProps} /></div>;
}
