(() => {
const { PageHeader, Button, StatCard, InputGroup, FilterTabs, DataTable, CellMain, Badge, Status, TaskPill, Pagination, Card, EmptyState, Modal, FormGrid, Field, Input, Select, Textarea } = window.StringHubDesignSystem_90e1d8;
function ContactsScreen({ toast }) {
  const [filter, setFilter] = React.useState("All");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState(window.SH_DATA.contacts);
  const [form, setForm] = React.useState({ name: "", email: "", type: "Customer" });
  const shown = rows.filter(r => (filter === "All" || r.type + "s" === filter) && (r.name + r.email).toLowerCase().includes(q.toLowerCase()));
  const add = (e) => { e.preventDefault(); if (!form.name) return; setRows([{ id: Date.now(), name: form.name, email: form.email || "—", type: form.type, status: "draft", statusLabel: "Invited", priority: "none", added: "28 Sep 2026" }, ...rows]); setOpen(false); setForm({ name: "", email: "", type: "Customer" }); toast({ title: "Contact added", message: form.name + " is in your contact list." }); };
  const cols = [
    { key: "name", label: "Name", render: r => <CellMain name={r.name} sub={r.email} tone={r.tone} /> },
    { key: "type", label: "Type", render: r => <Badge>{r.type}</Badge> },
    { key: "status", label: "Status", render: r => <Status tone={r.status}>{r.statusLabel}</Status> },
    { key: "priority", label: "Priority", render: r => <TaskPill kind="priority" value={r.priority} /> },
    { key: "added", label: "Added", className: "muted" },
    { key: "actions", label: "Actions", className: "actions", render: r => <><Button variant="ghost" size="sm" iconOnly icon="edit-alt" aria-label="Edit" /><Button variant="ghost" size="sm" iconOnly icon="dots-horizontal-rounded" aria-label="More" /></> }
  ];
  return <>
    <PageHeader breadcrumb={["Home", "Contacts"]} title="Contacts" subtitle="Everyone your team talks to, in one place."
      actions={<><Button variant="secondary" icon="download">Export</Button><Button icon="plus" onClick={() => setOpen(true)}>New contact</Button></>} />
    <div className="grid-4">
      <StatCard label="Total contacts" value="2,481" delta="+4.2%" sub="vs last month" />
      <StatCard label="Active" value="1,932" sub="engaged in 30 days" />
      <StatCard label="New this week" value="87" delta="+12" sub="vs last week" />
      <StatCard label="Blocked" value="14" delta="+3" deltaDir="down" sub="vs last month" />
    </div>
    <div className="toolbar">
      <InputGroup icon="search" search placeholder="Search contacts" aria-label="Search contacts" value={q} onChange={e => setQ(e.target.value)} />
      <FilterTabs items={["All", "Customers", "Leads", "Partners"]} value={filter} onChange={setFilter} label="Filter by type" />
      <div className="spacer"></div>
      <Button variant="secondary" size="sm" icon="filter-alt">Filters</Button>
    </div>
    <DataTable columns={cols} rows={shown}
      empty={<EmptyState compact icon="group" title="No contacts match these filters" description="Try a different search, or clear the filters to see everyone." actions={<Button variant="secondary" size="sm" onClick={() => { setQ(""); setFilter("All"); }}>Clear filters</Button>} />}
      footer={shown.length ? <Pagination from={1} to={shown.length} total="2,481" page={1} pages={3} /> : null} />
    <Modal open={open} onClose={() => setOpen(false)} icon="group" title="New contact" description="They'll appear in your contact list right away."
      footer={<><Button variant="custom-secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Add contact</Button></>}>
      <FormGrid>
        <Field label="Full name" htmlFor="nc-name" required><Input id="nc-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        <Field label="Email" htmlFor="nc-email"><Input id="nc-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Type" htmlFor="nc-type"><Select id="nc-type" options={["Customer", "Lead", "Partner"]} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="nc-phone"><Input id="nc-phone" type="tel" /></Field>
        <Field label="Notes" htmlFor="nc-notes" span2 hint="Only visible to your team."><Textarea id="nc-notes" /></Field>
      </FormGrid>
    </Modal>
  </>;
}
window.ContactsScreen = ContactsScreen;
})();
