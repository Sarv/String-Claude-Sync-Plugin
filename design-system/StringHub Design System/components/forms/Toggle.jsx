import React from "react";
export function Toggle({ label, ...rest }) { return <input type="checkbox" className="toggle" aria-label={label} {...rest} />; }
