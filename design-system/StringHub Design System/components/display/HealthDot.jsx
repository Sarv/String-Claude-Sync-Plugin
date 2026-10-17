import React from "react";
export function HealthDot({ tone = "good", label }) {
  return <span className="row-tight"><span className={"health-dot " + tone}></span>{label ? " " + label : null}</span>;
}
