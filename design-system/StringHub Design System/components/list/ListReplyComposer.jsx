import React from "react";
/** Reply composer of the Replies thread: email panel (To, Cc/Bcc, Subject) + rich-text box + emoji / attach + Internal note switch (turns amber, button becomes Add Note) + Reply. */
export function ListReplyComposer({ to = { name: "Customer", email: "customer@example.com" }, subject = "Re: …", defaultNote = false, onSubmit }) {
  const [note, setNote] = React.useState(defaultNote);
  return <div className={"tk-cform" + (note ? " note" : "")}><span className="tk-avatar c1">P</span><div>
    {note ? null : <div className="tk-email-panel"><header><i className="bx bx-mail-send" aria-hidden="true"></i><span>This reply will be emailed to the customer</span><input type="checkbox" className="toggle" defaultChecked aria-label="Email this reply" /></header>
      <div className="tk-email-row"><label>To</label><span className="tk-to"><i>{to.name.charAt(0)}</i>{to.name} &lt;{to.email}&gt;</span><input placeholder="Add another recipient" aria-label="Add recipient" /></div>
      <div className="tk-email-row"><button type="button" className="tk-ccbcc">+ Cc/Bcc</button></div>
      <div className="tk-email-row"><label>Subject</label><input defaultValue={subject} aria-label="Email subject" /></div></div>}
    <div className="rte"><div className="rte-content" contentEditable suppressContentEditableWarning data-placeholder={note ? "Write an internal note — not visible to the contact (Press '/' for commands)" : "Write a reply (Press '/' for commands)"} aria-label="Comment"></div></div>
    <div className="tk-cform-foot"><span><button type="button" className="tk-icon-btn" aria-label="Emoji"><i className="bx bx-smile" aria-hidden="true"></i></button><button type="button" className="tk-icon-btn" aria-label="Attach"><i className="bx bx-paperclip" aria-hidden="true"></i></button><i className="vs"></i>
      <label className="tk-note-toggle"><input type="checkbox" checked={note} onChange={(e) => setNote(e.target.checked)} /><i className="bx bx-lock-alt" aria-hidden="true"></i> {note ? "Internal note — only your team can see this" : "Internal note"}</label></span>
      <button type="button" className="tk-reply-btn" onClick={() => onSubmit && onSubmit({ note })}><i className={"bx " + (note ? "bx-lock-alt" : "bx-send")} aria-hidden="true"></i> {note ? "Add Note" : "Reply"}</button></div>
  </div></div>;
}
