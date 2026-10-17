import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
function ring(state, color, size) {
  const c = color || STATE_COLORS[state] || "#757575";
  const done = state === "resolved" || state === "closed";
  return <svg className={"tk-state" + (done ? " done" : "")} viewBox="0 0 26 26" style={{ "--c": c, width: size, height: size }} aria-hidden="true"><circle className="trk" r="9.75" cx="13" cy="13" /><circle className="arc" r="9.75" cx="13" cy="13" /><circle className="dot" r="4.5" cx="13" cy="13" /></svg>;
}
function flag(p) {
  return <span className="tk-slot" title={(p || "none").charAt(0).toUpperCase() + (p || "none").slice(1)}><svg className={"tk-flag " + (p || "none")} viewBox="0 0 48 60" aria-hidden="true"><path d="M40.7876 2.5737C29.1561 4.5185 15.017 2.36182 5.62262 0.0881193C3.18299 -0.50234 0.71611 1.97719 1.09747 4.45812C3.17005 17.9411 1.52481 41.9585 0.0174201 56.0937C-0.173072 57.88 1.22081 59.4428 3.01724 59.4428H4.14452C5.87935 59.4428 7.26022 57.9778 7.20558 56.2439C7.10373 53.0115 7.04734 48.1028 7.2028 42.1643C7.25776 40.0648 9.42637 38.6966 11.428 39.3323C25.392 43.7671 38.6069 40.4154 45.7565 37.1116C47.3497 36.3754 47.7589 34.3781 46.7295 32.9566L40.8007 24.7693C39.2706 22.6564 38.7925 19.9946 39.8189 17.5963C41.0594 14.6975 42.8638 10.8248 44.4858 6.69599C45.3773 4.42666 43.1924 2.17161 40.7876 2.5737Z" /></svg></span>;
}
function avatar(p, cls) {
  return p ? <span className={"tk-avatar c" + (p.tone || 1) + (cls ? " " + cls : "")} title={"Assigned to: " + p.name}>{p.name.charAt(0)}</span> : <i className="bx bx-user tk-unassigned" title="Unassigned" aria-hidden="true"></i>;
}
function tags(list) {
  if (!list || !list.length) return <span className="tk-add-tags"><i className="bx bx-purchase-tag" aria-hidden="true"></i> Add tags</span>;
  return <>{<span className="tk-tag" style={{ "--c": list[0].color }}>{list[0].name}</span>}{list.length > 1 ? <span className="tk-more">+{list.length - 1}</span> : null}</>;
}
function contactPill(c) {
  return c ? <span className={"tk-contact c" + (c.tone || 3)} title={"Customer: " + c.name}>{c.name}</span> : <span className="tk-add-tags"><i className="bx bx-user-x" aria-hidden="true"></i> No contact linked</span>;
}
/** One ticket in the List view (~40px): key chip, subject, replies pill | state ring, priority flag, assignee, tag, contact, updated, ⋯. conversation = contact-first two-line row of the Conversation route. */
export function TicketRow({ ticket, conversation, onClick, onReplies }) {
  const t = ticket || {};
  const reps = <button type="button" className={"tk-replies" + (t.replies ? "" : " zero")} title="Replies" onClick={(e) => { e.stopPropagation(); onReplies && onReplies(); }}><i className="bx bx-message-rounded" aria-hidden="true"></i> {t.replies || 0}</button>;
  if (conversation) {
    return <div className="tk-row conv" tabIndex={0} onClick={onClick}>
      <div className="tk-row-main">{t.contact ? <span className={"tk-conv-avatar c" + (t.contact.tone || 3)}>{t.contact.name.charAt(0)}</span> : <span className="tk-conv-avatar"><i className="bx bx-conversation" aria-hidden="true"></i></span>}
        <div className="tk-conv-lines"><b>{t.contact ? t.contact.name : t.subject}</b><small>#{t.id}</small><span>{t.subject}</span></div>{reps}</div>
      <div className="tk-row-side"><span className="tk-conv-fields tk-row-side">{ring(t.state, t.stateColor)}{flag(t.priority)}{tags(t.tags)}</span>{avatar(t.assignee)}<button type="button" className="tk-dots" aria-label="More"><i className="bx bx-dots-horizontal-rounded" aria-hidden="true"></i></button></div>
      <span className="tk-corner-time">{t.updated}</span>
    </div>;
  }
  return <div className="tk-row" tabIndex={0} onClick={onClick}>
    <div className="tk-row-main"><span className="tk-keychip"><i className="bx bx-receipt" aria-hidden="true"></i>{t.id}</span><span className="tk-subject" title={t.subject}>{t.subject}</span>{reps}</div>
    <div className="tk-row-side">
      <span className="tk-slot">{ring(t.state, t.stateColor)}</span>{flag(t.priority)}{avatar(t.assignee)}{tags(t.tags)}{contactPill(t.contact)}
      <span className="tk-meta" title="Last updated"><i className="bx bx-time-five" aria-hidden="true"></i> {t.updated}</span>
      <button type="button" className="tk-dots" aria-label="More" onClick={(e) => e.stopPropagation()}><i className="bx bx-dots-horizontal-rounded" aria-hidden="true"></i></button>
    </div>
  </div>;
}
