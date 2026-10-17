(() => {
const { PageHeader, Button, StatCard, FilterTabs, Card, LegendDot, ActivityFeed, Banner, DashCard, Heatmap } = window.StringHubDesignSystem_90e1d8;
function DashboardScreen() {
  const [range, setRange] = React.useState("7 days");
  const heat = [0,1,2,3,4,5,6].map(d => Array.from({ length: 24 }, (_, h) => Math.round((d < 5 ? 46 : 18) * Math.exp(-Math.pow((h - 13) / 3.2, 2)))));
  return <>
    <PageHeader breadcrumb={["Home", "Dashboard"]} title="Dashboard" subtitle="How your support desk is doing this week."
      actions={<><FilterTabs items={["Today", "7 days", "30 days"]} value={range} onChange={setRange} label="Date range" /><Button variant="secondary" icon="download">Export</Button></>} />
    <div className="grid-4">
      <StatCard label="Open tickets" value="342" delta="-8%" deltaDir="down" sub="vs last week" />
      <StatCard label="First response" value="14m" delta="-3m" sub="median" />
      <StatCard label="Resolved" value="1,208" delta="+11%" sub="this week" />
      <StatCard label="CSAT" value="94%" delta="0%" deltaDir="flat" sub="from 312 ratings" />
    </div>
    <div className="grid-sidebar">
      <Card title="Tickets over time" subtitle="Opened vs resolved, last 12 weeks" actions={<div className="row-tight"><LegendDot color="var(--chart-1)">Opened</LegendDot><LegendDot color="var(--chart-2)">Resolved</LegendDot></div>}>
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" width="100%" height="200" role="img" aria-label="Tickets opened vs resolved">
          <g style={{ stroke: "var(--chart-grid)" }} strokeWidth="1"><line x1="0" y1="50" x2="600" y2="50" /><line x1="0" y1="100" x2="600" y2="100" /><line x1="0" y1="150" x2="600" y2="150" /></g>
          <polyline fill="none" style={{ stroke: "var(--chart-1)" }} strokeWidth="2.5" strokeLinejoin="round" points="0,140 55,120 110,128 165,96 220,104 275,80 330,88 385,62 440,70 495,48 550,56 600,40" />
          <polyline fill="none" style={{ stroke: "var(--chart-2)" }} strokeWidth="2.5" strokeLinejoin="round" points="0,160 55,150 110,146 165,130 220,124 275,118 330,104 385,100 440,92 495,84 550,74 600,70" />
        </svg>
      </Card>
      <Card title="Recent activity" actions={<a href="#">View all</a>}>
        <ActivityFeed items={[
          { icon: "check", tone: "success", text: <><strong>Diya Sharma</strong> ticket #4821 was resolved</>, when: "2 min ago" },
          { icon: "error-circle", tone: "danger", text: <>SLA breached on <strong>#4790</strong> — auto-escalated</>, when: "18 min ago" },
          { icon: "envelope", tone: "brand", text: <>New email from <strong>Globex</strong>, assigned to Kabir</>, when: "1 h ago" },
          { icon: "phone", tone: "info", text: <><strong>Rohan Gupta</strong> completed a callback</>, when: "3 h ago" }]} />
      </Card>
    </div>
    <DashCard title="Coverage" info="Agent actions per hour" sub="Weekday × hour, Asia/Kolkata"><Heatmap data={heat} /></DashCard>
    <Banner tone="info"><strong>Tip:</strong> connect WhatsApp to see chat volume on this dashboard.</Banner>
  </>;
}
window.DashboardScreen = DashboardScreen;
})();
