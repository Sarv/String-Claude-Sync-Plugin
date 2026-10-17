(() => {
const { PageHeader, Button, Avatar, TaskPill, Tabs, Card, ChatThread, ChatDay, ChatNote, ChatMessage, ChatComposer, KeyValue, Chip, Badge, StatMini, PropsPanel, StatePill, PriorityPill, Tag, ActivityFeed } = window.StringHubDesignSystem_90e1d8;
function TicketScreen({ toast }) {
  const [tab, setTab] = React.useState("conv");
  const [msgs, setMsgs] = React.useState([
    { from: "customer", name: "Diya Sharma", time: "10:42", text: "Hi, I returned my order last week but the refund still hasn't arrived." },
    { from: "agent", name: "Prem Saini", time: "10:47", text: "Sorry about that! I can see the return — the refund was issued today and should reach you in 3–5 days." }]);
  const [state, setState] = React.useState("in-progress");
  const send = (t) => setMsgs([...msgs, { from: "agent", name: "Prem Saini", time: "Now", text: t }]);
  return <>
    <PageHeader bar={false} leading={<Avatar name="Diya" size="lg" tone={2} />} breadcrumb={["Tickets", "#4821"]} title="Refund not received for order 88213"
      meta={<div className="row-tight"><TaskPill value={state === "resolved" ? "completed" : "in-progress"} dot>{state === "resolved" ? "Completed" : "In progress"}</TaskPill><TaskPill kind="priority" value="high" /><TaskPill kind="type" value="bug" /></div>}
      actions={<><Button variant="secondary">Assign</Button><Button icon="check" onClick={() => { setState("resolved"); toast({ title: "Ticket resolved", message: "#4821 moved to Resolved." }); }}>Resolve</Button></>} />
    <Tabs items={[{ id: "conv", label: "Conversation", count: msgs.length }, { id: "details", label: "Details" }, { id: "activity", label: "Activity", count: 4 }]} value={tab} onChange={setTab} />
    <div className="grid-sidebar">
      <div className="stack">
        {tab === "conv" ? <Card>
          <ChatThread><ChatDay>Today</ChatDay><ChatNote>Ticket created via <strong>email</strong> · assigned to <strong>Billing support</strong></ChatNote>
            {msgs.map((m, i) => <ChatMessage key={i} from={m.from} name={m.name} time={m.time}>{m.text}</ChatMessage>)}</ChatThread>
          <ChatComposer placeholder="Reply to Diya…" onSend={send} />
        </Card> : tab === "details" ? <Card title="Details"><KeyValue items={[["Requester", "Diya Sharma"], ["Email", "diya@northwind.in"], ["Channel", <Chip>Email</Chip>], ["Assignee", "Prem Saini"], ["Created", "25 Sep 2026, 10:42"], ["SLA", <Badge tone="success">On track</Badge>]]} /></Card>
        : <Card><ActivityFeed items={[{ icon: "check", tone: "success", text: <><strong>Prem Saini</strong> issued a refund</>, when: "1 h ago" }, { avatar: "K", avatarTone: 3, text: <><strong>Kabir Rao</strong> left a note</>, when: "2 h ago", quote: "Gateway retried the webhook twice." }, { icon: "purchase-tag", tone: "brand", text: <><strong>Automation</strong> added tag <Chip>Billing</Chip></>, when: "Yesterday" }, { icon: "envelope", text: <><strong>Diya Sharma</strong> opened the ticket via email</>, when: "Yesterday, 18:06" }]} /></Card>}
      </div>
      <div className="stack">
        <PropsPanel sections={[
          { title: "Details", rows: [{ label: "State", value: <StatePill state={state} /> }, { label: "Priority", value: <PriorityPill priority="high" /> }, { label: "Assignee", value: <span className="prop-person"><Avatar name="Prem" tone={1} />Prem Saini</span> }, { label: "Tags", top: true, value: <><Tag>Billing</Tag><Tag tone="danger">Refund</Tag></> }] },
          { title: "SLA", extra: "Standard 4h", rows: [{ sla: true, label: "First response", due: "Met 12 min ago", value: "Met", state: "met" }, { sla: true, label: "Resolution", due: "Due in 3 h 20 m", value: "Running", state: "running" }] }]} />
        <div className="grid-2"><StatMini tone="brand" label="Replies" value={msgs.length} sub="1 from customer" /><StatMini tone="success" label="First reply" value="5m" sub="under SLA" /></div>
      </div>
    </div>
  </>;
}
window.TicketScreen = TicketScreen;
})();
