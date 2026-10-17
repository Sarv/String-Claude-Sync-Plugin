List-view ticket row. Rows live inside a TicketListGroup (grouped) or a flat `<div className="tk-list"><div className="tk-list-card">…</div></div>`. Clicking a row opens ListDetailModal.
```jsx
<TicketRow ticket={{ id:"TKT-1042", subject:"Refund not received for order 88213", state:"in-progress", priority:"urgent",
  assignee:{name:"Diya Sharma", tone:1}, contact:{name:"Aarav Mehta", tone:3}, tags:[{name:"Billing", color:"#E6A117"}], replies:4, updated:"25 Sep 2026" }}
  onClick={() => setOpen(true)} />
```
