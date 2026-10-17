import React from "react";
/** ⌘K global search: filters results as you type, Esc closes. */
export function SearchDialog({ open, onClose, results = [], onSelect, placeholder = "Search by key, title, description…" }) {
  const [q, setQ] = React.useState("");
  React.useEffect(() => { if (!open) return; const k = (e) => e.key === "Escape" && onClose && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;
  const s = q.toLowerCase(), list = results.filter((r) => !s || (r.title + " " + (r.sub || "") + " " + (r.key || "")).toLowerCase().includes(s));
  return <div className="modal-backdrop search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
    <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Search">
      <div className="search-input-row"><i className="bx bx-search icon-22" aria-hidden="true"></i><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search" />
        {q ? <button className="search-clear" onClick={() => setQ("")}>Clear</button> : null}<button className="btn-close" aria-label="Close" onClick={onClose}><i className="bx bx-x icon-20" aria-hidden="true"></i></button></div>
      <div className="search-body">
        <div className="search-group-head"><span>Search results</span><span className="count">{list.length} results</span></div>
        {list.map((r, i) => <a key={i} className="search-result" href="#" onClick={(e) => { e.preventDefault(); onSelect && onSelect(r); }}>
          <span className="sr-ico"><i className={"bx bx-" + (r.icon || "support") + " icon-17"} aria-hidden="true"></i></span>
          <span className="sr-body"><span className="sr-title">{r.title}</span>{r.sub ? <span className="sr-sub">{r.sub}</span> : null}{r.key || r.meta ? <span className="sr-meta">{r.key ? <span className="sr-key">{r.key}</span> : null}{r.meta ? " · " + r.meta : null}</span> : null}</span>
          <span className="sr-enter">↵</span></a>)}
        {!list.length ? <div className="search-empty"><div className="se-ico"><i className="bx bx-search icon-28" aria-hidden="true"></i></div><h4>No results found</h4><p>Try a different keyword or ticket key.</p></div> : null}
      </div>
      <div className="search-foot"><span><span className="kbd">↵</span> Select</span><span><span className="kbd">↑</span><span className="kbd">↓</span> Navigate</span><span><span className="kbd">esc</span> Close</span></div>
    </div></div>;
}
