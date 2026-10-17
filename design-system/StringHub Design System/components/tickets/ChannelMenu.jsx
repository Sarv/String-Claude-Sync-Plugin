import React from "react";
const MODES = [
  { key: "whatsapp", name: "WhatsApp", sub: "Business Cloud API", icon: "bxl-whatsapp", bg: "#DCFCE7", c: "#16A34A" },
  { key: "email", name: "Email", sub: "Reply to Thread", icon: "bx-envelope", bg: "#E0E7FF", c: "#4338CA" },
  { key: "note", name: "Private note", sub: "Internal Note", icon: "bx-lock-alt", bg: "#FEF3C7", c: "#D97706" },
  { key: "linkedin", name: "LinkedIn", sub: "InMail / DM", icon: "bxl-linkedin", bg: "#DBEAFE", c: "#1D4ED8" },
];
/** "Reply via channel" menu of the conversation composer. */
export function ChannelMenu({ value = "whatsapp", options = MODES, onChange }) {
  return <div className="tk-channel-menu" role="menu"><div className="hd">Reply via channel</div>
    {options.map((m) => <button key={m.key} type="button" role="menuitem" onClick={() => onChange && onChange(m.key)}><span className="tile" style={{ "--bg": m.bg, "--c": m.c }}><i className={"bx " + m.icon} aria-hidden="true"></i></span><span><b>{m.name}</b><small>{m.sub}</small></span>{m.key === value ? <i className="bx bx-check" aria-hidden="true"></i> : null}</button>)}
  </div>;
}
