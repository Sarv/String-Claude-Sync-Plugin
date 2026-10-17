(() => {
const { SettingsShell, SettingsCard, SettingRow, Toggle, Input, Button, FormActionBar, ConfirmDialog, FormRow, Select, InputGroup } = window.StringHubDesignSystem_90e1d8;
function SettingsScreen({ toast }) {
  const [sec, setSec] = React.useState("general");
  const [del, setDel] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  return <SettingsShell entity={{ mark: "CS", name: "Customer Support" }} active={sec} onNavigate={setSec} title="General" description="Name, identifier and defaults for this desk."
    nav={[{ group: "Desk" }, { id: "general", label: "General", icon: "cog" }, { id: "members", label: "Members", icon: "group" }, { id: "sla", label: "SLA policies", icon: "time-five" }, { id: "rules", label: "Assignment rules", icon: "git-branch" }, { group: "Channels" }, { id: "email", label: "Email", icon: "envelope" }, { id: "wa", label: "WhatsApp", icon: "bxl-whatsapp" }]}>
    <SettingsCard title="Desk details" description="Shown to agents and in customer emails.">
      <div className="form-rows" onChange={() => setDirty(true)}>
        <FormRow label="Desk name" hint="Visible in the sidebar." htmlFor="dn"><Input id="dn" defaultValue="Customer Support" /></FormRow>
        <FormRow label="Identifier" hint="Prefix for ticket IDs, e.g. SUPP-42." htmlFor="di"><Input id="di" defaultValue="SUPP" /></FormRow>
        <FormRow label="Timezone" htmlFor="tz"><Select id="tz" options={["Asia/Kolkata (GMT+5:30)", "UTC"]} /></FormRow>
        <FormRow label="Support email" hint="Replies are sent from this address." htmlFor="se"><InputGroup id="se" icon="envelope" defaultValue="help@acme.io" /></FormRow>
      </div>
    </SettingsCard>
    <SettingsCard flush title="Automation" description="How new tickets are handled.">
      <SettingRow title="Auto-assign" description="Round-robin between online agents."><Toggle label="Auto-assign" defaultChecked onChange={() => setDirty(true)} /></SettingRow>
      <SettingRow title="Business hours only" description="Pause SLAs outside 9:00–18:00."><Toggle label="Business hours only" onChange={() => setDirty(true)} /></SettingRow>
    </SettingsCard>
    <SettingsCard danger title="Delete desk" description="Permanently remove this desk and all its tickets.">
      <Button variant="outline-danger" icon="trash" onClick={() => setDel(true)}>Delete desk</Button>
    </SettingsCard>
    <FormActionBar note={dirty ? "You have unsaved changes" : null}><Button variant="custom-secondary" onClick={() => setDirty(false)}>Cancel</Button><Button onClick={() => { setDirty(false); toast({ title: "Changes saved", message: "Your desk settings are live." }); }}>Save changes</Button></FormActionBar>
    <ConfirmDialog open={del} tone="danger" title="Delete “Customer Support”?" message="All 214 tickets in this desk will be deleted for everyone. This can’t be undone." confirmLabel="Delete desk" onCancel={() => setDel(false)} onConfirm={() => { setDel(false); toast({ tone: "danger", title: "Desk deleted", message: "Customer Support was removed." }); }} />
  </SettingsShell>;
}
window.SettingsScreen = SettingsScreen;
})();
