Buttons for every action; pick the variant by role, not by colour.
```jsx
<Button icon="plus">New contact</Button>
<Button variant="custom-secondary">Cancel</Button>
<Button variant="custom-button" size="sm" icon="filter-alt">Filter</Button>
<Button variant="primary">Sign in</Button>
<Button variant="danger" icon="trash">Delete</Button>
```
Rules: one `custom-primary` per view (modal/drawer = own view). Form footer = custom-secondary Cancel + custom-primary Save. `loading` keeps the label and adds a spinner.
