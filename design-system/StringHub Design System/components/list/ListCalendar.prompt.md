Calendar view for any dated list: chips tinted by state, "Load more (N more)", hover "New Item" (newLabel), today = filled brand circle, other-month days dimmed. Build `days` Monday-first (5 or 6 weeks × 7).
```jsx
<ListCalendar title="September 2026" days={[{label:31, other:true}, {label:"01 Sep"}, {label:2}, /* … */ {label:25, today:true, items:[{subject:"Add bulk export", state:"open"}]}]} />
```
