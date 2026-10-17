Top of any list page with views (tickets, tasks…): put it with ListFiltersBar inside a sticky `<div className="tk-head-wrap">`, then render ONE view (TicketListGroup rows / ListBoard / ListCalendar / ListTable / GalleryView) under it. The view switcher order is List · Board · Calendar · Table · Gallery.
```jsx
const [view, setView] = React.useState("list");
<div className="tk-page">
  <div className="tk-head-wrap">
    <ListHeaderBar desk="Billing Support" title="Tickets" newLabel="New Ticket" count={128} view={view} onViewChange={setView} />
    <ListFiltersBar filters={[{label:"State", values:[{text:"In Progress", color:"#F59E0B"}]}]} />
  </div>
  {view === "list" ? <div className="tk-list">…</div> : null}
</div>
```
