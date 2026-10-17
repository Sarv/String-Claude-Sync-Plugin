import React from "react";
export function Pagination({ from, to, total, page = 1, pages = 1, onPage, label }) {
  const nums = [];
  for (let i = 1; i <= Math.min(pages, 5); i++) nums.push(i);
  const go = (p) => onPage && p >= 1 && p <= pages && onPage(p);
  return <div className="pagination"><span>{label ?? <>Showing {from}–{to} of {total}</>}</span>
    <div className="pages">
      <button aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}><i className="bx bx-chevron-left icon-14" aria-hidden="true"></i></button>
      {nums.map((n) => <button key={n} className={n === page ? "active" : undefined} aria-current={n === page ? "page" : undefined} onClick={() => go(n)}>{n}</button>)}
      <button aria-label="Next page" disabled={page >= pages} onClick={() => go(page + 1)}><i className="bx bx-chevron-right icon-14" aria-hidden="true"></i></button>
    </div></div>;
}
