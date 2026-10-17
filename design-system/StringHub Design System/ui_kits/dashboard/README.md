# StringHub dashboard — UI kit

Click-through recreation of the StringHub support dashboard (orbit react-dashboard skin), built only from this design system's components.

Source of truth: `stringhubTheme/templates/{list-page,dashboard,form-page,detail-page}.html` and `templates/components/{work,layouts}.html`.

Screens (sidebar switches between them; last screen is remembered):
- **SignInScreen** — auth card (Sign out in the topbar returns here).
- **DashboardScreen** — KPIs, tickets-over-time chart, activity feed, coverage heatmap, tip banner.
- **TicketScreen** — ticket #4821: conversation with working composer, Details / Activity tabs, properties + SLA panel, Resolve → toast.
- **BoardScreen** — Orbit project: kanban ⇄ grouped list (segmented), removable filter chips.
- **ContactsScreen** — search + filter tabs over a table, empty state, New contact modal → adds a row + toast.
- **SettingsScreen** — settings shell, split form rows, toggles, danger card + confirm dialog, action bar.

Also: ⌘K / search trigger opens global search; moon icon toggles dark mode; panel icon collapses the sidebar.
