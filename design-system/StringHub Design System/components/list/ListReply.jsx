import React from "react";
/** One reply in an item's Replies thread (comments on a ticket, task…): customer = left, green; employee = right, brand; internal = right, amber. Each has name, role badge, time; your own show Edit / Delete (+ Emailed). */
export function ListReply({ role = "employee", name, tone = 1, time, emailed, own, children }) {
  const cls = "tk-comment" + (role === "customer" ? " customer" : role === "internal" ? " internal" : "");
  const badge = role === "customer" ? "Customer" : role === "internal" ? "Internal" : "Employee";
  return <div className={cls}><span className={"tk-avatar c" + tone}>{(name || "?").charAt(0)}</span><div>
    <div className="tk-cbubble"><div className="tk-chead"><span><b>{name}</b><span className="tk-role">{badge}</span></span><time>{time}</time></div><div className="tk-cbody">{children}</div></div>
    {own ? <div className="tk-cactions">{emailed ? <span className="sent"><i className="bx bx-envelope" aria-hidden="true"></i> Emailed</span> : null}<button type="button">Edit</button><button type="button">Delete</button></div> : null}
  </div></div>;
}
