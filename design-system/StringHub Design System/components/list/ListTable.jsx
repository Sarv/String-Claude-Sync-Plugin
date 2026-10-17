import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
const NAMES = { open: "Open", "in-progress": "In Progress", "on-hold": "On Hold", resolved: "Resolved", closed: "Closed" };
const CH = { email: "envelope", chat: "message-rounded-dots", phone: "phone", api: "code-alt", portal: "globe" };
function ring(state, color) { const done = state === "resolved" || state === "closed"; return <svg className={"tk-state" + (done ? " done" : "")} viewBox="0 0 26 26" style={{ "--c": color }} aria-hidden="true"><circle className="trk" r="9.75" cx="13" cy="13" /><circle className="arc" r="9.75" cx="13" cy="13" /><circle className="dot" r="4.5" cx="13" cy="13" /></svg>; }
/** Table view for any list (tickets, tasks…): sticky checkbox + subject columns, state pill, priority pill, assignee, channel, tags, contact, updated, ⋯. selected: ids -> bulk bar on top. */
export function ListTable({ items = [], selected = [], onToggle, onOpen, onClearSelection, label = "Items" }) {
  return <>
    {selected.length ? <div className="tk-bulk"><b>{selected.length} selected</b><span className="sep"></span>
      <select aria-label="Set State"><option>Set State</option></select><select aria-label="Set Priority"><option>Set Priority</option></select><select aria-label="Assign to"><option>Assign to</option></select>
      <span style={{ flex: 1 }}></span><button type="button" className="btn btn-secondary"><i className="bx bx-git-merge" aria-hidden="true"></i> Merge</button><button type="button" className="btn btn-ghost" onClick={onClearSelection}>Clear</button></div> : null}
    <div className="tk-table" role="grid" aria-label={label}>
      <div className="tk-tr tk-thead">{["", "Subject", "State", "Priority", "Assignee", "Channel", "Tags", "Contact", "Updated", "Actions"].map((h, i) => <div key={i} className="tk-th">{h}</div>)}</div>
      <div className="tk-tbody">{items.map((t) => { const on = selected.includes(t.id); const c = t.stateColor || STATE_COLORS[t.state]; return <div key={t.id} className="tk-tr">
        <div className="tk-td"><span className={"tk-check" + (on ? " on" : "")} role="checkbox" aria-checked={on} tabIndex={0} aria-label={"Select " + t.id} onClick={() => onToggle && onToggle(t.id)}></span></div>
        <div className="tk-td tk-subj-cell"><span className="tk-tile"><i className="bx bx-receipt" aria-hidden="true"></i></span><small>{t.id}</small><span onClick={() => onOpen && onOpen(t)}>{t.subject}</span></div>
        <div className="tk-td"><span className="tk-state-pill" style={{ "--c": c }}>{ring(t.state, "#FFFFFF")} {t.stateName || NAMES[t.state]}</span></div>
        <div className="tk-td"><span className={"tk-prio-pill tk-prio-" + t.priority}>{t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span></div>
        <div className="tk-td">{t.assignee ? <span className={"tk-avatar c" + (t.assignee.tone || 1)} title={"Assigned to: " + t.assignee.name}>{t.assignee.name.charAt(0)}</span> : <i className="bx bx-user tk-unassigned" aria-hidden="true"></i>}</div>
        <div className="tk-td">{t.channel ? <span className={"tk-channel ch-" + t.channel.type}><i className={"bx bx-" + (CH[t.channel.type] || "globe")} aria-hidden="true"></i> {t.channel.name}</span> : <span className="tk-add-tags">No Channel</span>}</div>
        <div className="tk-td" style={{ gap: 4 }}>{t.tags && t.tags.length ? <><span className="tk-tag" style={{ "--c": t.tags[0].color }}>{t.tags[0].name}</span>{t.tags.length > 1 ? <span className="tk-more">+{t.tags.length - 1}</span> : null}</> : <span className="tk-add-tags"><i className="bx bx-purchase-tag" aria-hidden="true"></i> Add tags</span>}</div>
        <div className="tk-td">{t.contact ? <span className={"tk-contact c" + (t.contact.tone || 3)}>{t.contact.name}</span> : <span className="tk-add-tags">No contact linked</span>}</div>
        <div className="tk-td"><span className="tk-date-cell">{t.updated}</span></div>
        <div className="tk-td"><button type="button" className="tk-dots tk-center" aria-label="More"><i className="bx bx-dots-horizontal-rounded" aria-hidden="true"></i></button></div>
      </div>; })}</div>
    </div></>;
}
