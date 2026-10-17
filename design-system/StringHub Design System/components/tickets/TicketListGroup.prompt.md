Grouped List view: one group per state, stacked in `<div className="tk-list">`.
```jsx
<div className="tk-list">
  <TicketListGroup state="in-progress" count={2} avatars={[{name:"Diya Sharma",tone:1}]}>
    <TicketRow ticket={t1} /><TicketRow ticket={t2} />
  </TicketListGroup>
</div>
```
