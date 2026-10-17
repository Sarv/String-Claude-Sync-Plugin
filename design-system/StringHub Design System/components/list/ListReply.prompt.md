Replies-thread comment. Stack them in `<div className="tk-comments">` (add `compact` inside a popover) and end with ListReplyComposer.
```jsx
<div className="tk-comments">
  <ListReply role="customer" name="Aarav Mehta" tone={3} time="22 Sep 2026 10:02 AM">Hi, my refund still hasn’t arrived.</ListReply>
  <ListReply name="Diya Sharma" time="22 Sep 2026 10:24 AM" own emailed>It was re-issued today.</ListReply>
  <ListReply role="internal" name="Diya Sharma" time="22 Sep 2026 10:26 AM" own>Batch failed on the gateway.</ListReply>
</div>
```
