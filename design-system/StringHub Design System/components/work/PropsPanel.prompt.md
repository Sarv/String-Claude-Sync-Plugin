Label/value properties sidebar beside a ticket (115px labels, collapsible sections, SLA rows).
```jsx
<PropsPanel sections={[{title:"Details",rows:[{label:"State",value:<StatePill state="in-progress"/>},{label:"Priority",value:<PriorityPill priority="high"/>}]},
  {title:"SLA",rows:[{sla:true,label:"Resolution",due:"Overdue by 2 h",value:"Breached",state:"breached"}]}]} />
```
