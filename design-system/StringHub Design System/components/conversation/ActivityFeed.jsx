import React from "react";
/** Who did what, when. item.icon+tone = marker; item.avatar = person marker. */
export function ActivityFeed({ items = [] }) {
  return <ol className="feed">{items.map((it, i) => <li className="feed-item" key={i}>
    {it.avatar ? <span className={"avatar avatar-sm g" + (it.avatarTone || 1)}>{it.avatar}</span> : <span className={"feed-marker" + (it.tone ? " " + it.tone : "")}><i className={"bx bx-" + (it.icon || "info-circle") + " icon-14"} aria-hidden="true"></i></span>}
    <div className="feed-content"><div className="feed-text">{it.text}</div><div className="feed-when">{it.when}</div>{it.quote ? <div className="feed-quote">{it.quote}</div> : null}</div></li>)}</ol>;
}
