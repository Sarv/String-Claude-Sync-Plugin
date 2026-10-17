Row/page action menu or select-style menu.
```jsx
<DropdownMenu label="Actions" items={[{header:"Ticket"},{label:"Edit",icon:"edit-alt",kbd:"E"},{divider:true},{label:"Delete",icon:"trash",danger:true}]} />
<DropdownMenu select icon="time-five" label="Last 7 days" value={range} onSelect={setRange} items={[{label:"Today"},{label:"Last 7 days"}]} />
```
