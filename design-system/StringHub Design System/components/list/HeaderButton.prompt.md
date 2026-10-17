Ghost page-header action for list pages (Export, Import CSV, Merge duplicates) - 40px, table-head tint, 16px icon. Always BEFORE the single primary Button (variant "custom-primary") in PageHeader actions.
```jsx
<PageHeader title="Contacts" subtitle="Manage contacts and track the tickets raised by each." actions={<>
  <HeaderButton icon="download">Export</HeaderButton>
  <HeaderButton icon="upload">Import CSV</HeaderButton>
  <HeaderButton icon="git-merge">Merge duplicates</HeaderButton>
  <Button variant="custom-primary" icon="plus">Create Contact</Button>
</>} />
```
