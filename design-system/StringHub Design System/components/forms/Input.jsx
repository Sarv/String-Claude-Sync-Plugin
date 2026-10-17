import React from "react";
export function Input({ invalid, className, ...rest }) {
  return <input className={"input" + (className ? " " + className : "")} aria-invalid={invalid || undefined} {...rest} />;
}
