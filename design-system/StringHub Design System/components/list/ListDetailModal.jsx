import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
function ring(state, color, size) {
  const c = color || STATE_COLORS[state] || "#757575";
  const done = state === "resolved" || state === "closed";
  return <svg className={"tk-state" + (done ? " done" : "")} viewBox="0 0 26 26" style={{ "--c": c, width: size, height: size }} aria-hidden="true"><circle className="trk" r="9.75" cx="13" cy="13" /><circle className="arc" r="9.75" cx="13" cy="13" /><circle className="dot" r="4.5" cx="13" cy="13" /></svg>;
}
/** Detail dialog (94vw × 92vh) for any list item, opened from a row / card / chip: gradient header (breadcrumb, ID, Saved, Last Edited By, "Item n of N", ⋯, open, close), a 260px Breakdown rail, tabs Conversation · Form · Attachment · Activity (+ New Item, Close), and the properties sidebar. inline renders it in place (docs). Put ConversationPanel (or other content) as children for the active tab. */
export function ListDetailModal({ open = true, inline, onClose, item = {}, itemLabel = "Item", newLabel = "New Item", breadcrumb = ["Workspace", "Support", "Items"], index = 1, total = 1, editedBy = "Diya Sharma", channels = [], sidebar, tab: tabProp, onTabChange, children }) {
  const [tabState, setTab] = React.useState("conversation");
  const tab = tabProp || tabState;
  if (!open) return null;
  const tabs = [["conversation", "message-rounded", "Conversation"], ["form", "clipboard", "Form"], ["attachment", "paperclip", "Attachment"], ["activity", "history", "Activity"]];
  const dialog = <div className={"tk-detail" + (inline ? " inline" : "")} role="dialog" aria-modal={!inline} aria-label={itemLabel + " " + (item.id || "")}>
    <div className="tk-dhead">
      <div className="tk-dleft"><nav className="tk-bc" aria-label="Breadcrumb">{breadcrumb.map((b, i) => <React.Fragment key={i}>{i ? <i className="bx bx-chevron-right" aria-hidden="true"></i> : null}<a href="#" onClick={(e) => e.preventDefault()}>{b}</a></React.Fragment>)}</nav><span className="tk-idpill" title="ID">{item.id}</span></div>
      <div className="tk-dright">
        <span className="tk-saved">Saved</span>
        <button type="button" className="tk-edited"><i className="bx bx-history" aria-hidden="true"></i><span className="tk-avatar c1">{editedBy.charAt(0)}</span><span>Last Edited By <b>{editedBy}</b></span><i className="bx bx-chevron-down" aria-hidden="true"></i></button>
        <span className="tk-vsep"></span>
        <span className="tk-counter">{itemLabel} <b>{index}</b> of <i>{total}</i></span>
        <button type="button" className="tk-icon-btn" aria-label="More"><i className="bx bx-dots-vertical-rounded" aria-hidden="true"></i></button>
        <button type="button" className="tk-icon-btn" aria-label="Open in full view"><i className="bx bx-link-external" aria-hidden="true"></i></button>
        <button type="button" className="tk-icon-btn" aria-label="Close" onClick={onClose}><i className="bx bx-x" aria-hidden="true"></i></button>
      </div>
    </div>
    <div className="tk-dbody">
      <div className="tk-dcontent">
        <aside className="tk-breakdown" aria-label="Breakdown">
          <div className="tk-bd-row1"><button type="button" className="tk-bd-trigger"><i className="bx bx-conversation" aria-hidden="true"></i><span>Breakdown: Channel</span><i className="bx bx-chevron-down" aria-hidden="true"></i></button></div>
          <div className="tk-bd-row2"><i className="bx bx-git-branch" aria-hidden="true"></i> Channels</div>
          <label className="tk-bd-search"><i className="bx bx-search" aria-hidden="true"></i><input placeholder="Search channels..." aria-label="Search channels" /></label>
          <div className="tk-bd-list"><button type="button" className="tk-bd-item active"><i className="bx bx-conversation" aria-hidden="true"></i><span>All Channels</span><span className="tk-bd-count">{channels.reduce((a, c) => a + c.count, 0)}</span></button>
            {channels.map((c, i) => <button key={i} type="button" className="tk-bd-item" style={{ "--c": c.color }}><i className={"bx " + c.icon} aria-hidden="true"></i><span>{c.name}</span><span className="tk-bd-count">{c.count}</span></button>)}</div>
        </aside>
        <div className="tk-dmain">
          <div className="tk-dtabs"><div role="tablist" aria-label="Sections">{tabs.map(([k, ic, l]) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); onTabChange && onTabChange(k); }}><i className={"bx bx-" + ic} aria-hidden="true"></i> {l}</button>)}</div>
            <div className="tk-dtab-actions"><button type="button" className="tk-btn-outline" disabled><i className="bx bx-plus" aria-hidden="true"></i> {newLabel}</button><button type="button" className="tk-btn-solid"><i className="bx bx-check-circle" aria-hidden="true"></i> Close</button></div></div>
          <div className="tk-dpanel" role="tabpanel">
            <div className="tk-subhead"><i className="bx bx-receipt" aria-hidden="true"></i><span style={{ fontWeight: 400 }}>{item.subject}</span></div>
            {children}
          </div>
        </div>
      </div>
      <div className="tk-resize" aria-hidden="true"><button type="button" className="tk-collapse" aria-label="Collapse properties"><i className="bx bx-chevron-right" aria-hidden="true"></i></button></div>
      <div className="tk-dside">{sidebar}</div>
    </div>
  </div>;
  if (inline) return dialog;
  return <div className="tk-detail-backdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>{dialog}</div>;
}
