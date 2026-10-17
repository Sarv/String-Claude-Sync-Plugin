Flat 12px card with 1px border — every group of content lives in one.
```jsx
<Card title="General" subtitle="Shown to customers." footer={<><Button variant="custom-secondary">Cancel</Button><Button>Save</Button></>}>…</Card>
```
No ad-hoc bordered divs. Don't repeat the page header's Save in the footer.
