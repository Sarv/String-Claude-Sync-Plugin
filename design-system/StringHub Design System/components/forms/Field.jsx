import React from "react";
export function Field({ label, htmlFor, hint, error, required, span2, children }) {
  return <div className={"field" + (span2 ? " span-2" : "")}>
    {label ? <label className="label" htmlFor={htmlFor}>{label}{required ? <span className="required">*</span> : null}</label> : null}
    {children}
    {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
  </div>;
}
