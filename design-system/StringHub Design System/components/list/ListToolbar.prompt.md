Row of 30px controls under a list page's PageHeader (dashboard contact list). Order: ViewToggle, StatusToggle, FilterSelect (quick filter with icon), ToolbarSearch, more FilterSelects, DateFilterButton(s), SaveViewButton (pushed right). While rows are checked render BulkBar inside it instead of the controls.
```jsx
<ListToolbar>
  <ViewToggle value="list" />
  <StatusToggle value="active" />
  <FilterSelect icon="filter-alt" options={["All", "Has company", "No company"]} />
  <ToolbarSearch placeholder="Search name, email, phone…" />
  <FilterSelect options={["Company: any", "Acme", "Globex"]} />
  <DateFilterButton label="Created" />
  <DateFilterButton icon="history" label="Updated" range="01 Sep – 15 Sep" />
  <SaveViewButton />
</ListToolbar>
```
