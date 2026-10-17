import React from "react";
/** Trigger + anchored menu. items: {label, icon, kbd, danger} | {divider:true} | {header}. select=true shows the chosen item. */
export function DropdownMenu({ label, icon, items = [], select, value, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { if (!open) return; const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false); document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  const shown = select ? (value ?? label) : label;
  return <div className="ds-dropdown" ref={ref}>
    <button className={"ds-dropdown-trigger" + (open ? " open" : "")} aria-haspopup={select ? "listbox" : "menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
      {icon ? <i className={"bx bx-" + icon + " icon-14"} aria-hidden="true"></i> : null} <span>{shown}</span> <span className="chev"><i className="bx bx-chevron-down icon-14" aria-hidden="true"></i></span></button>
    <div className={"ds-dropdown-menu" + (open ? " open" : "")} role={select ? "listbox" : "menu"}>
      {items.map((it, i) => it.divider ? <div key={i} className="ds-dropdown-divider"></div> : it.header ? <div key={i} className="ds-dropdown-header">{it.header}</div> :
        <button key={i} className={"ds-dropdown-item" + (it.danger ? " danger" : "") + (select && it.label === shown ? " selected" : "")} role={select ? "option" : "menuitem"}
          onClick={() => { setOpen(false); onSelect && onSelect(it.label, it); }}>
          {it.icon ? <span className="item-icon"><i className={"bx bx-" + it.icon + " icon-14"} aria-hidden="true"></i></span> : null}{it.label}
          {it.kbd ? <span className="item-kbd">{it.kbd}</span> : null}{select ? <span className="item-check"><i className="bx bx-check icon-14" aria-hidden="true"></i></span> : null}</button>)}
    </div></div>;
}
