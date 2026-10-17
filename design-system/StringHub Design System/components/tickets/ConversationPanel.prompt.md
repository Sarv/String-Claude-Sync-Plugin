Conversation tab of ListDetailModal (also usable in any full-height column). Consecutive messages on the same side are grouped (corner shapes are automatic).
```jsx
<ConversationPanel threads={[{ label:"WhatsApp · +91 98200 11223", icon:"bxl-whatsapp", color:"#25D366", messages:[
  { side:"in", text:"Hi, my refund hasn't arrived.", meta:"10:02 AM" },
  { side:"out", ai:true, text:"I can see the pickup - a teammate will check.", meta:"10:02 AM", by:"AI Assistant" },
  { note:true, text:"Refund batch failed - re-queued.", meta:"10:20 AM · By: Diya Sharma" },
  { side:"out", text:"Your refund was re-issued today.", meta:"10:24 AM", by:"Diya Sharma", read:true } ] }]} />
```
