The list/table pattern: #EEF4FC capitalised 12.5px header, 13.5px cells, #FBFBFB row hover, no shadow.
```jsx
<DataTable columns={[{key:"name",label:"Name",render:r=><CellMain name={r.name} sub={r.email}/>},{key:"added",label:"Added",className:"muted"}]}
  rows={rows} footer={<Pagination from={1} to={5} total={2481} page={1} pages={3} />} />
```
Row tints: `rowClassName={r => r.breached ? "row-danger" : undefined}`.
