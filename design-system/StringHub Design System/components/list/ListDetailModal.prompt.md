Detail dialog opened when a row / board card / calendar chip is clicked. Sidebar = PropsPanel (Details: State, Priority, Assignee, Channel, Tags · Contact · SLA Targets). Conversation tab content = ConversationPanel.
```jsx
<ListDetailModal open={open} onClose={() => setOpen(false)} item={{id:"TKT-1042", subject:"Refund not received for order 88213"}} itemLabel="Ticket" newLabel="New Ticket"
  breadcrumb={["Acme","Billing Support","Tickets"]} index={1} total={128}
  channels={[{name:"WhatsApp", icon:"bxl-whatsapp", color:"#25D366", count:6},{name:"Email", icon:"bx-envelope", color:"#8B5CF6", count:3}]}
  sidebar={<PropsPanel card={false} sections={[{title:"Details", rows:[{label:"State", value:<StatePill state="in-progress" />}]}]} />}>
  <ConversationPanel threads={[…]} />
</ListDetailModal>
```
