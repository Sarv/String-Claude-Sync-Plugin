(() => {
const { PageHeader, Button, Segmented, FilterBar, BoardColumn, BoardCard, ListGroup, ListRow } = window.StringHubDesignSystem_90e1d8;
const BOARD = {
  backlog: [{ id: "ORB-142", title: "Export tickets to CSV with custom fields", type: "feature", priority: "low", due: "Oct 12", comments: 2, subtasks: "0/3", assignee: "K", tone: 3 }, { id: "ORB-150", title: "Dark mode for the widget", type: "improvement", due: null, comments: 0, subtasks: "0/0", assignee: "M", tone: 5 }],
  "in-progress": [{ id: "ORB-131", title: "Refund webhook fires twice on retries", type: "bug", priority: "urgent", due: "Yesterday", overdue: true, comments: 7, subtasks: "2/4", assignee: "P", tone: 6 }, { id: "ORB-138", title: "SLA timer pauses outside business hours", type: "feature", priority: "high", due: "Sep 28", comments: 3, subtasks: "1/2", assignee: "D", tone: 2 }],
  "in-review": [{ id: "ORB-127", title: "Assign by round-robin across online agents", type: "update", priority: "medium", due: "Sep 26", comments: 5, subtasks: "3/3", assignee: "A", tone: 1 }],
  completed: [{ id: "ORB-119", title: "WhatsApp templates picker", type: "new", due: "Sep 20", comments: 9, subtasks: "4/4", assignee: "R", tone: 4 }]
};
function BoardScreen() {
  const [view, setView] = React.useState("board");
  const [filters, setFilters] = React.useState([{ key: "Project", value: "Orbit" }, { key: "Priority", value: "Urgent", tone: "danger" }, { key: "Assignee", value: "Me", tone: "success" }]);
  return <>
    <PageHeader breadcrumb={["Home", "Projects", "Orbit"]} title="Orbit dashboard" count={6} subtitle="Work items for the orbit support dashboard."
      actions={<><Segmented width={200} items={[{ id: "board", label: "Board", icon: "grid-alt" }, { id: "list", label: "List", icon: "list-ul" }]} value={view} onChange={setView} /><Button icon="plus">New work item</Button></>} />
    <FilterBar filters={filters} onRemove={(f, i) => setFilters(filters.filter((_, j) => j !== i))} onClear={() => setFilters([])} onAdd={() => {}} />
    {view === "board" ? <div className="board">{Object.entries(BOARD).map(([s, cards]) => <BoardColumn key={s} status={s}>{cards.map(c => <BoardCard key={c.id} {...c} assigneeTone={c.tone} />)}</BoardColumn>)}</div>
      : <div className="list-view">{Object.entries(BOARD).map(([s, cards]) => <ListGroup key={s} status={s}>{cards.map(c => <ListRow key={c.id} id={c.id} title={c.title} priority={c.priority || "none"} assignee={c.assignee} assigneeTone={c.tone} date={c.due} overdue={c.overdue} />)}</ListGroup>)}</div>}
  </>;
}
window.BoardScreen = BoardScreen;
})();
