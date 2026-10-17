Active / Deleted (or Active / Inactive / Deleted) toggle in a ListToolbar.
```jsx
<StatusToggle value={listType} onChange={setListType} />
<StatusToggle value="active" options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"},{value:"deleted",label:"Deleted"}]} />
```
