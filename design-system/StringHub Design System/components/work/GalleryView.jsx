import React from "react";
/** Three-column triage view: groups · ticket cards · detail. */
export function GalleryView({ groupTitle = "States", groups = [], selectedGroup, onGroup, tickets = [], selectedTicket, onTicket, detail, onNew }) {
  const [q, setQ] = React.useState("");
  const gs = groups.filter((g) => g.label.toLowerCase().includes(q.toLowerCase()));
  const cur = groups.find((g) => g.id === selectedGroup);
  return <div className="gallery-view">
    <aside className="gv-groups"><div className="gv-head"><span className="gv-title">{groupTitle}</span><span className="gv-total">{groups.length}</span></div>
      <label className="gv-search"><i className="bx bx-search" style={{ fontSize: 18 }} aria-hidden="true"></i><input placeholder={"Search " + groupTitle.toLowerCase() + "..."} value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="gv-group-list">{gs.map((g) => <button key={g.id} type="button" className={"gv-group" + (g.id === selectedGroup ? " selected" : "")} aria-pressed={g.id === selectedGroup} onClick={() => onGroup && onGroup(g.id)}>
        <span className="gv-gico"><i className={"bx bx-" + g.icon} style={{ color: g.color }} aria-hidden="true"></i></span><span className="gv-label">{g.label}</span><span className="gv-count">{g.count}</span></button>)}</div></aside>
    <section className="gv-tickets"><div className="gv-tickets-head"><div><h3>Tickets</h3><p>{cur ? cur.label : ""}</p></div></div>
      <div className="gv-ticket-list">{tickets.map((t) => <button key={t.id} type="button" className={"gv-card" + (t.id === selectedTicket ? " selected" : "")} aria-pressed={t.id === selectedTicket} onClick={() => onTicket && onTicket(t.id)}>
        <span className="gv-key"><span className="gv-key-ico"><i className="bx bx-receipt" style={{ fontSize: 10 }} aria-hidden="true"></i></span>{t.id}</span><span className="gv-subject">{t.subject}</span>
        <span className="gv-meta"><i className={"bx bx-" + (cur ? cur.icon : "circle") + " gv-status"} style={{ "--_c": cur ? cur.color : undefined }} aria-hidden="true"></i><span className={"gv-prio " + t.priority}>{t.priority}</span><span className="gv-spacer"></span>
          <span className="gv-stat"><i className="bx bx-time-five" style={{ fontSize: 12 }} aria-hidden="true"></i> {t.date}</span><span className="gv-stat"><i className="bx bx-message-rounded" style={{ fontSize: 12 }} aria-hidden="true"></i> {t.replies}</span><span className={"avatar g" + (t.tone || 1)}>{t.assignee}</span></span></button>)}</div>
      <button className="gv-new" onClick={onNew}><i className="bx bx-plus" style={{ fontSize: 16 }} aria-hidden="true"></i> New Ticket</button></section>
    <section className="gv-detail">{detail || <div className="gv-empty lg"><i className="bx bx-receipt" aria-hidden="true"></i><p>Select a ticket to view its details</p></div>}</section>
  </div>;
}
