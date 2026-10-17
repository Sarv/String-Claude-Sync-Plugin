# StringHub Design System

StringHub is a customer-support / work-management web app: support desks, tickets (email, chat, WhatsApp, phone), contacts, projects with kanban work items, SLA policies and reporting dashboards. The UI is the **orbit `react-dashboard`** (MUI) look, re-expressed as plain CSS classes + tokens so any stack can match it.

There is one product surface: the **StringHub dashboard** (logged-in web app). No marketing site, mobile app or slide template was provided.

## Rules for every new design (read first)

1. **Start from the closest StringHub page and keep its structure.** List / index pages = PageHeader (title 18/500 + subtitle,
   HeaderButton ghost actions, ONE `Button variant="custom-primary"` last) → ListToolbar (ViewToggle, StatusToggle,
   FilterSelect, ToolbarSearch, DateFilterButton, SaveViewButton; BulkBar while rows are checked) → `.table-card` table
   with PersonCell / OrgCell / ChannelChips / WhenCell / RowSettingsButton. Ticket / work-item pages = the Tickets
   group: sticky `.tk-head-wrap` with ListHeaderBar + ListFiltersBar, then ONE view chosen by the view switcher
   (List = TicketListGroup + TicketRow, Board = ListBoard, Calendar = ListCalendar, Table = ListTable,
   Gallery = GalleryView); clicking a ticket opens ListDetailModal (ConversationPanel / ListActivity inside,
   PropsPanel as its sidebar). Replies = ListReply + ListReplyComposer. Reference pages: `_src/*.html`.
2. **Build only from these components and classes.** Every element is a component here or a class in
   `css/design-system.css`. Never invent new components, layouts, colours, shadows, radii, fonts or icon sets;
   if something is missing, compose it from existing components.
3. **Tokens, never raw values** (`var(--brand)`, `var(--surface)`, `var(--space-4)` …). Light and dark both come from them.
4. **Icons are Boxicons** (`<i class="bx bx-…">` or the Icon component); the StringHub mark is never redrawn or recoloured.

## Sources
- Codebase: `stringhubTheme/` (package `@stringhub/theme` v0.2.0, attached locally, read-only). Key files: `design-system.css` (all tokens + component classes, ~6k lines), `CLAUDE.md` (build guide), `templates/*.html` (list, tickets with List · Board · Calendar · Table · Gallery + detail modal, conversation, dashboard, form, detail pages), `templates/components/*.html` (every component sample), `icons/` (brand mark + logos), `fonts.css`, `tokens.json`, `mui-theme.js`.
- That package is itself generated from `sarv_theme/` (Sarv design system) and values from `react-dashboard/app/src/theme/` (`lightPremiumTheme.js`, `darkThemePremium.js`) — not attached here.

## Index
- `styles.css` — entry point (imports only) → `css/fonts.css` (Inter, JetBrains Mono, Boxicons via CDN) + `css/design-system.css` (verbatim copy of the theme: tokens + every component class). `css/icons/` holds the sibling images the CSS references.
- `assets/` — `stringhub-logo.svg`, `stringhub-logo-dark.svg`, `stringhub-mark.svg`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/<group>/` — React primitives (`.jsx` + `.d.ts` + `.prompt.md`, one `*.card.html` per group).
- `ui_kits/dashboard/` — click-through recreation of the app (see its README).
- `_src/` — copies of the original template pages, for reference: `list-page.html` (contacts list: header, toolbar, table), `tickets-page.html` (tickets header + filters, the five views, detail modal), `conversation-page.html` (Conversation route), plus dashboard / form / detail pages.
- `SKILL.md` — Agent Skill entry.

## Components
All components emit the theme's own class names (`.btn`, `.card`, `.task-pill` …) — the CSS does the styling.
- **display**: Icon, Button, IconButton, Status, Badge, Chip, Tag, TaskPill, CountBadge, Delta, HealthDot, Avatar, AvatarGroup, Kbd
- **containers**: Card, StatCard, StatMini, EntityCard, KeyValue, Accordion, DataTable, CellMain, Pagination
- **forms**: Field, FormGrid, Input, Select, Textarea, InputGroup, Checkbox, Radio, Toggle, SettingRow, FormRow, PickCard, ChoiceCard, OptionCard, OptionChips, Dropzone, AvatarUpload, RichTextEditor
- **feedback**: Banner, Toast, EmptyState, Skeleton, ProgressBar, Spinner, Scrim
- **overlays**: Modal, ConfirmDialog, Drawer, DropdownMenu, Tooltip, HoverCard, FormActionBar
- **navigation**: Tabs, FilterTabs, Segmented, PillNav, Breadcrumb, SearchTrigger, SearchDialog
- **conversation**: ChatThread, ChatDay, ChatNote, ChatMessage, ChatComposer, ActivityFeed
- **work**: BoardColumn, BoardCard, FilterBar, ListGroup, ListRow, CalendarView, StatePill, PriorityPill, SlaChip, PropsPanel, GalleryView
- **charts**: DashCard, Heatmap, Sankey, LegendDot, RatioCell, ChartTip
- **layout**: Sidebar, Topbar, AppShell, PageHeader, SettingsShell, SettingsCard, SplitView, ListItem, AuthShell
- **list** (list pages and any list's views): HeaderButton, ListToolbar, ViewToggle, StatusToggle, FilterSelect, ToolbarSearch, DateFilterButton, SaveViewButton, ViewCrumb, BulkBar, PersonCell, OrgCell, ChannelChips, WhenCell, RowSettingsButton, ListBoard, ListCalendar, ListTable, ListDetailModal, ListActivity, ListReply, ListReplyComposer, ListHeaderBar, ListFiltersBar (generic: labels default to "Item" / "New Item", pass itemLabel / newLabel for "Ticket", "Task" …)
- **tickets** (list view rows, conversation): StateRing, PriorityFlag, TicketListGroup, TicketRow, ConversationPanel, ChannelMenu

### Intentional additions
- **Icon** — thin wrapper over the Boxicons `<i class="bx …">` markup so sizes use the theme's `.icon-N` classes.
- **CellMain**, **Spinner**, **Scrim**, **ChartTip**, **CountBadge**, **Kbd** — one-class markup patterns from the source given a component name for convenience.
- Not wrapped (CSS classes still ship, use raw markup): `.ds-calendar` date picker, `.ds-daterange`, `.code-block`, `.rte-bubble` / `.rte-slash` menus. Sarv-only classes (pipeline, waveform, map, channel/language cards) are in the CSS but StringHub doesn't use them — never build with them.

## UI kits
- `ui_kits/dashboard/index.html` — Sign in, Dashboard, Ticket detail, Projects board/list, Contacts, Settings.

---

## CONTENT FUNDAMENTALS
- **Sentence case everywhere**: "New contact", "Save changes", "Workspace settings" — never Title Case. Table headers are capitalised by CSS (`text-transform: capitalize`), not in copy.
- **Buttons are verbs**: New contact, Send invite, Delete workspace, Try again, Clear filters. The primary label names the object when ambiguous ("Delete desk", not "Confirm").
- **Voice**: plain, calm, helpful product voice. Speaks to the user as **you** ("They'll get an email with a link to join.", "Email me when a ticket is assigned to me."), refers to the team as "your team". First person only in the user's own settings ("Notify me about").
- **Page subtitles** are one line on what the page is for: "Everyone your team talks to, in one place." · "How your support desk is doing this week."
- **Empty states** say what's missing + what to do: "No contacts match these filters — Try a different search, or clear the filters to see everyone." Positive empty: "Inbox zero — Every ticket assigned to you is resolved. Nice work."
- **Destructive confirmations** name the thing and say it can't be undone: "Delete “Billing support”? All 214 tickets in this desk will be deleted for everyone. This can’t be undone."
- **Errors** reassure and offer the fix: "Something went wrong on our side. Your data is safe." · "We couldn't reach your CRM. Contacts may be out of date." + Retry.
- **Toasts** are short past-tense results: "Changes saved", "Ticket archived", "Couldn't send reply".
- Numbers are concrete and compact: "14m", "1,208", "+4.2%", "n=120", "Overdue by 2 h", "Due in 3 h 20 m". IDs look like `ORB-142`, `SUPP-4821`, `#4821`.
- Typographic punctuation (’ “ ” – — …) is used. Sample people and places are Indian (Diya Sharma, Kabir Rao, Asia/Kolkata, ₹, GST, UPI).
- **No emoji** in UI copy. Unicode is used only for keyboard hints (⌘ ↵ ↑ ↓ esc) and ‹ › in minimal pagination.

## VISUAL FOUNDATIONS
- **Overall vibe**: a quiet, flat, lavender-tinted enterprise dashboard. Dense (13px base), light grey page, white flat cards, soft violet accents, pastel status pills.
- **Color**: brand violet `#7E7BDE` (`--brand`) with a lavender family (chip bg `#E1E1F9`, brand-soft `#F0EFFE`); accent purple `#9C27B0` for rare AI moments; MUI semantic greens/reds/oranges/blues (`--color-success/danger/warning/info-*`, 50 tint / 500 solid / 700 text). Neutrals are cool slate (page `#F8FAFC`, card border `#E8ECEF`, text `#1A1D23`/`#212529`, secondary `#64748B`). Work items have their own pastel palette (`--task-status-*`, `--task-priority-*`, `--task-type-*`). Avatars use six deep tones (teal, burgundy, charcoal green, maroon, shadow blue, purple) with one white initial.
- **Brand mark is the exception**: original blue `#3069B0` + orange `#E56910` — never recoloured into the violet palette.
- **Gradients**: only in app chrome — header `90deg #DEDEF8 → #E3E4F9 → #F4E8FE`, sidebar panel `119deg #EFDDFF → #DFDFF9`, and the CustomPrimary button (lavender gradient, violet text). No gradients on content, cards or backgrounds. Dark mode flattens them to greys.
- **Type**: Inter (400–800) for everything, JetBrains Mono for keys/IDs/code. Base 13px; controls 13.5px; labels 14/600; page title 18/500; card titles 14/600–700; KPI values bold with −0.02em tracking; overlines 11px uppercase 600 with 0.05em tracking.
- **Spacing**: strict 4px scale (`--space-1…10` = 4 8 12 16 20 24 32 40 48 64). Page sections 16px apart, items inside a card 12px. Page gutter 16px. One control height: 40px (sm 30/32, lg 44).
- **Corner radii**: 6px pills/badges/menu items, 8px menus/dropdowns, 10px controls (`--r-control`) and dashboard cards, 12px cards/tables/modals, 999 for pulse dots/opt-chips.
- **Cards**: white `--surface`, 1px `#E8ECEF` border, 12px radius, **no shadow**. Head = title + subtitle + right action, separated by a hairline; foot holds Cancel + Save. Cards are the only container — no ad-hoc bordered divs; never colored left-border accent cards.
- **Shadows**: flat system. Cards/tables none; menus/popovers `0 1px 5px rgba(0,0,0,.1)`; dialogs/drawers `0 10px 15px -3px rgba(15,23,42,.08)`; focus ring `0 0 0 3px rgba(126,123,222,.15)`.
- **Borders**: 1px hairlines everywhere (`--border`, `--card-border`, `--form-border #EEE`); a violet hairline (`--header-line`) under the header and page-header strip. Hover strengthens to `--border-strong`.
- **Backgrounds**: flat colour only. No photography, illustrations, textures or patterns in the product. The auth screen uses a soft brand glow behind a centred card. Empty states use a tinted icon tile, not illustrations.
- **Layout**: fixed 224px sidebar (collapses to a 55–65px icon rail) with a lavender rounded panel; 47px gradient header with search, grey icon buttons and a ringed avatar; scrolling `.page`; white page-header strip across the top. Grids: `.grid-2/3/4`, `.grid-auto` (≥260px), `.grid-sidebar` (main + 320px).
- **Hover states**: rows tint to `#FBFBFB`; neutral items get `--hover-neutral`; entity cards lift slightly with a violet border; icon buttons darken their grey fill; links go `--link-hover`.
- **Press/selected**: selected = brand border + ~8% brand fill + brand text (pick cards, filter tabs, pill nav: white pill on tinted bar). Active nav item = translucent white fill + 600 weight. No shrink/bounce on press.
- **Animation**: short and functional — 120/180/280ms with `cubic-bezier(.22,1,.36,1)` ease-out. Fades and small slides (toasts slide in from the right, drawers from the right edge), skeleton shimmer, spinner rotation, pulse dot on live statuses, toast timer bar. `prefers-reduced-motion` zeroes durations.
- **Transparency & blur**: only for overlays — modal backdrops dim; the ⌘K search backdrop is `rgba(0,0,0,.4)` + 6px blur; the loading scrim veils a card. Sidebar active/hover use translucent white.
- **Status tints**: status chips are 12% tints of the tone colour with solid-tone text; task pills are solid pastels with 6px corners, 12px/500.
- **Dark mode**: `.dark` or `[data-theme="dark"]` → neutral greys (`#141618` page, `#1C1D1F` cards), brand `#956FFF`, all aliases flip.
- **Imagery**: none in the product; if needed, keep it neutral/cool and inside a card.

## ICONOGRAPHY
- **Boxicons 2.1.4** is the only icon set (the same font the dashboard uses), loaded from CDN by `css/fonts.css` (`https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css`). Markup: `<i class="bx bx-search" aria-hidden="true"></i>`; or the `Icon` component.
- Styles: `bx-` regular line icons (default), `bxs-` solid for active/filled states (e.g. `bxs-flag`), `bxl-` brand logos (`bxl-whatsapp`).
- Sizes come from components (buttons 16/14, sidebar 18, icon buttons 20, empty states 36, confirm dialog 52) or `.icon-12 … .icon-52` classes. Colour is always `currentColor` from a token.
- Common names: grid-alt (dashboard), support (tickets/desk), group (contacts), bar-chart-alt-2 (reports), cog, search, plus, filter-alt, bell, envelope, phone, calendar, time-five, check / check-circle, x, info-circle, error-circle, edit-alt, trash, dots-horizontal-rounded, download, paperclip, send, link, archive, purchase-tag, flag, task, git-branch, bot (AI), loader-alt + bx-spin (loading). Verify a name exists in 2.1.4 (`bx-bolt` doesn't).
- **No custom icon SVGs, no emoji, no other libraries.** Unicode only for keyboard hints (⌘ ↵ esc) and the ↵ in search results.
- Brand: `assets/stringhub-mark.svg` (25–28px in sidebar/header, 64px on auth, favicon); `assets/stringhub-logo.svg` / `-dark.svg` for mark + wordmark. `css/icons/world-map.svg` is referenced by the (Sarv-only) map component.

## Caveats
- Fonts are loaded from Google Fonts / jsDelivr CDN (as the source does) — no local font binaries.
- `css/design-system.css` is a verbatim copy of the generated theme; the source of truth is `stringhubTheme/build/src/` (not attached). Only `@kind` annotation comments were added.
