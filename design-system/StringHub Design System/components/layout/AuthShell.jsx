import React from "react";
/** Centered sign-in card on a soft brand glow. */
export function AuthShell({ logoSrc = "assets/stringhub-mark.svg", title, subtitle, children, foot }) {
  return <div className="auth-shell" data-component="auth-shell"><div className="auth-card"><div className="card card-pad">
    <div className="auth-brand"><img src={logoSrc} alt="" /><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>{children}</div>
    {foot ? <p className="auth-foot">{foot}</p> : null}</div></div>;
}
