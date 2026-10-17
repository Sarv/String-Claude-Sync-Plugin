import React from "react";
const ROLE = { customer: "Customer", agent: "Agent", note: "Internal note" };
/** customer = left green · agent = right violet · note = right amber (internal). */
export function ChatMessage({ from = "customer", name, initials, role, time, attachment, children }) {
  const ini = initials ?? String(name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return <div className={"chat-row " + from}><div className="who">{ini}</div>
    <div className="body"><div className="meta"><span className="who-name">{name}</span><span className="role">{role ?? ROLE[from]}</span>{time ? <span>{time}</span> : null}</div>
      <div className="bubble">{children}{attachment ? <div className="bubble-attach"><i className="bx bx-file icon-14" aria-hidden="true"></i> {attachment.name} {attachment.size ? <span className="muted">· {attachment.size}</span> : null}</div> : null}</div></div></div>;
}
