Board view for any list (tickets, tasks, leads): 300px state columns on the board-column tint, cards with key, 2-line subject, updated, replies, priority flag, tag, contact, assignee; empty columns show a dashed drop zone; a collapsed column is a 56px rail.
```jsx
<ListBoard newLabel="New Ticket" columns={[{state:"open", items:[t1]},{state:"in-progress", items:[t2, t3]},{state:"on-hold", items:[]},{state:"closed", items:[t4], collapsed:true}]} onOpen={openDetail} />
```
