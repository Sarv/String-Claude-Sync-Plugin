import React from "react";
/** Reply box under a thread. note=true turns it amber for internal notes. */
export function ChatComposer({ placeholder = "Write a reply…", note, onSend, onNote }) {
  const [v, setV] = React.useState("");
  const send = () => { if (!v.trim()) return; onSend && onSend(v); setV(""); };
  const tb = (icon, tip) => <button className="btn btn-ghost btn-icon btn-sm" data-tip={tip} aria-label={tip}><i className={"bx bx-" + icon + " icon-14"} aria-hidden="true"></i></button>;
  return <div className={"chat-composer" + (note ? " note" : "")}>
    <textarea placeholder={placeholder} aria-label="Reply" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}></textarea>
    <div className="composer-bar">{tb("paperclip", "Attach")}{tb("smile", "Emoji")}{tb("at", "Mention")}{tb("bot", "AI suggest")}<div className="spacer"></div>
      <span className="hint"><span className="kbd">⌘</span> <span className="kbd">↵</span> to send</span>
      <button className="btn btn-secondary btn-sm" onClick={onNote}>Add note</button>
      <button className="btn btn-primary btn-sm" onClick={send}><i className="bx bx-send icon-14" aria-hidden="true"></i> Send</button></div></div>;
}
