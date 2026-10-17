import React from "react";
export function Dropzone({ title = "Drop files here", hint, accept, multiple = true, onFiles }) {
  const [files, setFiles] = React.useState([]);
  const pick = (list) => { const a = Array.from(list || []); setFiles(a); onFiles && onFiles(a); };
  return <div>
    <div className="dropzone" tabIndex={0} role="button" aria-label="Upload files" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}>
      <i className="bx bx-upload icon-28" aria-hidden="true"></i><div><strong>{title}</strong> or click to browse</div>{hint ? <div className="hint">{hint}</div> : null}
      <input type="file" multiple={multiple} accept={accept} onChange={(e) => pick(e.target.files)} /></div>
    {files.length ? <ul className="file-list">{files.map((f, i) => <li key={i}><i className="bx bx-file icon-16" aria-hidden="true"></i><span className="truncate">{f.name}</span><span className="muted">{Math.max(1, Math.round(f.size / 1024))} KB</span></li>)}</ul> : null}
  </div>;
}
