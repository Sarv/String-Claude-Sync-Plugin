Bulk action bar shown in the ListToolbar slot while rows are selected (tinted 30px bar).
```jsx
<ListToolbar>
  <BulkBar count={3} actions={[{label:"Move to company", menu:true},{label:"Set segment", menu:true},{label:"Merge", icon:"git-merge"},{label:"Export", icon:"download"},{label:"Delete", icon:"trash", danger:true}]} onClear={() => {}} />
</ListToolbar>
```
