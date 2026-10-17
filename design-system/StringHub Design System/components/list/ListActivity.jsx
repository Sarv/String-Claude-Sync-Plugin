import React from "react";
/** Activity tab of ListDetailModal: centred card with a day separator and rows (30px initials avatar with a coloured type badge, sentence with bold parts, time). */
export function ListActivity({ day = "Today", items = [] }) {
  return <div className="tk-dscroll"><div className="tk-activity"><div className="tk-daysep">{day}</div>
    {items.map((a, i) => <div key={i} className="tk-act"><span className="tk-act-av" style={{ "--c": a.color || "#D97706", "--b": a.badgeColor || "#7E7BDE" }}>{a.initials}<i className={"bx " + (a.icon || "bx-user")} aria-hidden="true"></i></span><p>{a.text}</p><time>{a.time}</time></div>)}
  </div></div>;
}
