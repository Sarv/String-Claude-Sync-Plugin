import React from "react";
const TOOLS = [["bold","bold"],["italic","italic"],["underline","underline"],["strikeThrough","strikethrough"],"|",["formatBlock","H1","<h1>"],["formatBlock","H2","<h2>"],["formatBlock","H3","<h3>"],"|",["insertUnorderedList","list-ul"],["insertOrderedList","list-ol"],"|",["formatBlock","bxs-quote-alt-left","<blockquote>"],["formatBlock","code-alt","<pre>"],"|",["createLink","link"],["insertHorizontalRule","minus"]];
/** Knowledge-base editor (.rte). toolbar=false for replies/comments. Mockup-grade (execCommand). */
export function RichTextEditor({ toolbar = true, placeholder = "Write something...", defaultHtml = "", label = "Editor" }) {
  const run = (cmd, val) => { if (cmd === "createLink") val = prompt("Link URL") || undefined; document.execCommand(cmd, false, val); };
  return <div className="rte">
    {toolbar ? <div className="rte-toolbar" role="toolbar" aria-label="Formatting">{TOOLS.map((t, i) => t === "|" ? <span className="rte-sep" key={i} aria-hidden="true"></span> :
      <button type="button" key={i} className="rte-btn" aria-label={t[1]} onMouseDown={(e) => { e.preventDefault(); run(t[0], t[2]); }}>
        {/^H\d$/.test(t[1]) ? t[1] : <i className={"bx " + (t[1].startsWith("bxs-") ? t[1] : "bx-" + t[1])} style={{ fontSize: 18 }} aria-hidden="true"></i>}</button>)}</div> : null}
    <div className="rte-content" contentEditable suppressContentEditableWarning data-placeholder={placeholder} aria-label={label} dangerouslySetInnerHTML={{ __html: defaultHtml }}></div>
  </div>;
}
