import React from "react";
/** The only container. Optional head (title/sub/actions), padded body, foot. */
export function Card({ title, subtitle, actions, footer, padded = true, className, style, children }) {
  return <div className={"card" + (className ? " " + className : "")} style={style}>
    {title ? <div className="card-head"><div><h3>{title}</h3>{subtitle ? <p className="card-sub">{subtitle}</p> : null}</div>{actions}</div> : null}
    {padded ? <div className="card-pad">{children}</div> : children}
    {footer ? <div className="card-foot">{footer}</div> : null}
  </div>;
}
