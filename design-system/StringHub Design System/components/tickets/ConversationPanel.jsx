import React from "react";
/** Ticket conversation (detail ActiveChat): channel threads with a coloured badge; bubbles in (accent tint, left) / out (grey, right) / ai (purple); private notes (amber, centred); files; then the reply composer with channel + "Reply From". */
export function ConversationPanel({ threads = [], channel = { name: "WhatsApp", icon: "bxl-whatsapp" }, replyFrom = "+91 80471 00000", placeholder = "Reply or type '/' for quick templates...", onSend }) {
  const [draft, setDraft] = React.useState("");
  return <>
    <div className="tk-chat">{threads.map((th, i) => <details key={i} className="tk-thread" open={th.open !== false}>
      <summary><span className="tk-thread-badge" style={{ "--c": th.color }}><i className={"bx " + th.icon} aria-hidden="true"></i></span><b>{th.label}</b><small>{th.messages.length} Messages</small><i className="bx bx-chevron-down" aria-hidden="true"></i></summary>
      <div className="tk-thread-body">{th.messages.map((m, j) => {
        if (m.note) return <div key={j} className="tk-note turn"><div className="tk-note-label"><i className="bx bx-file" aria-hidden="true"></i> Private note</div>{m.text}<div className="tk-bubble-meta">{m.meta}</div></div>;
        const prev = th.messages[j - 1], next = th.messages[j + 1];
        const same = (x) => x && !x.note && x.side === m.side;
        const pos = same(prev) ? (same(next) ? " mid" : " last") : (same(next) ? " first" : "");
        const cls = "tk-msg " + (m.side === "out" ? "out" : "in") + pos + (same(prev) || j === 0 ? "" : " turn") + (m.ai ? " ai" : "") + (m.selected ? " selected" : "");
        const av = same(prev) ? <span className="tk-msg-av ghost"></span> : m.ai ? <span className="tk-msg-av ai"><i className="bx bx-bot" aria-hidden="true"></i></span> : <span className="tk-msg-av"><i className="bx bx-user" aria-hidden="true"></i></span>;
        return <div key={j} className={cls}>{av}<div>
          <div className="tk-bubble">{m.file ? <div className="tk-file" style={{ "--c": m.file.pdf ? "#DC2626" : "#2563EB" }}><span className="tk-file-ico"><i className={"bx " + (m.file.pdf ? "bxs-file-pdf" : "bx-file")} aria-hidden="true"></i></span><span><b>{m.file.name}</b><small>{m.file.meta}</small></span></div> : m.text}</div>
          {m.meta ? <div className="tk-bubble-meta">{m.meta}{m.by ? <> · By: {m.ai ? <span className="ai-by">{m.by}</span> : m.by}</> : null}{m.read ? <> · <i className="bx bx-check-double read" aria-hidden="true"></i> Read</> : null}</div> : null}
        </div></div>;
      })}</div>
    </details>)}</div>
    <div className="tk-composer">
      <div className="tk-comp-meta"><button type="button" className="tk-comp-channel"><i className={"bx " + channel.icon} aria-hidden="true"></i> {channel.name} <i className="bx bx-chevron-down" aria-hidden="true"></i></button><span>·</span><span>Reply From:</span><i className="bx bx-check ok" aria-hidden="true"></i><b>{replyFrom}</b></div>
      <div className="tk-comp-input"><textarea rows={2} value={draft} placeholder={placeholder} aria-label="Reply" onChange={(e) => setDraft(e.target.value)}></textarea>
        <button type="button" className="tk-icon-btn" aria-label="Attach"><i className="bx bx-paperclip" aria-hidden="true"></i></button>
        <button type="button" className="tk-send" aria-label="Send" onClick={() => { onSend && onSend(draft); setDraft(""); }}><i className="bx bx-send" aria-hidden="true"></i></button></div>
    </div>
  </>;
}
