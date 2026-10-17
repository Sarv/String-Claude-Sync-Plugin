import React from "react";
/** 3px bar (MUI LinearProgress). */
export function ProgressBar({ value = 0, tone, label, valueLabel, large, indeterminate }) {
  const bar = <div className={"progress-track" + (large ? " lg" : "") + (indeterminate ? " indeterminate" : "")} role="progressbar" aria-valuenow={indeterminate ? undefined : Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={indeterminate ? "Loading" : undefined}>
    {indeterminate ? null : <span className={"progress-fill" + (tone ? " " + tone : "")} style={{ width: value + "%" }}></span>}</div>;
  return label ? <div><div className="progress-row"><span>{label}</span>{valueLabel ? <span className="muted">{valueLabel}</span> : null}</div>{bar}</div> : bar;
}
