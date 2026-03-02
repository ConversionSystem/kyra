# Kyra Dashboard Branding Guide

## Design System Foundation
- **Framework:** shadcn/ui components + Tailwind CSS
- **Theme:** Light only (no dark mode in dashboard)
- **Sidebar:** Dark (intentional contrast — DO NOT change)

## Colors

### Background
- Page background: inherits from `body` → `hsl(220 14% 96%)` (soft gray)
- **Never** use `bg-gray-900` or `bg-gray-800` on page content

### Cards
- Use `<Card>` component directly — already styled: `rounded-xl border border-gray-200 bg-white text-gray-900 shadow`
- **Never** override Card with `bg-gray-900 border-gray-800`
- Nested/subtle areas inside cards: `bg-gray-50`

### Text
| Usage | Class |
|-------|-------|
| Page title | `text-xl sm:text-2xl font-bold text-gray-900` |
| Card title | Use `<CardTitle>` (inherits `font-semibold`) |
| Section label | `text-sm font-semibold text-gray-500 uppercase tracking-wider` |
| Body text | `text-gray-700` |
| Label | `text-sm text-gray-600` |
| Muted/helper | `text-gray-500` or `text-gray-400` |
| Tiny/timestamp | `text-[11px] text-gray-400` or `text-xs text-gray-400` |
| **Never** | `text-white` on page content (only on buttons, badges, tooltips) |

### Buttons
- Primary: `bg-blue-600 hover:bg-blue-700 text-white` (or shadcn default which is indigo-600)
- Use `<Button>` component — variant="default" is `bg-indigo-600 text-white`
- Use `<Button variant="outline">` for secondary actions
- Use `<Button variant="ghost">` for tertiary/back links
- **Never** use `bg-gray-900` for buttons

### Inputs
- Use `<Input>` component directly — already styled with `border-gray-200 bg-transparent`
- **Never** override with `bg-gray-800 border-gray-700 text-white`
- Custom textareas: `bg-white border border-gray-200 text-gray-900 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
- Custom selects: same pattern as textareas

### Stat Cards (reference: solo-overview.tsx)
```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center gap-2.5">
      <div className="rounded-lg bg-{color}-50 p-2">
        <Icon className="h-4 w-4 text-{color}-600" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Status Colors
| State | Badge/Chip | Background |
|-------|-----------|------------|
| Success/Online | `bg-emerald-100 text-emerald-700` | `bg-emerald-50 border-emerald-200` |
| Warning | `bg-amber-100 text-amber-700` | `bg-amber-50 border-amber-200` |
| Error | `bg-red-100 text-red-700` | `bg-red-50 border-red-200` |
| Info | `bg-blue-100 text-blue-700` | `bg-blue-50 border-blue-200` |

### Alert Boxes
- Success: `bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700`
- Error: `bg-red-50 border border-red-200 rounded-lg p-3 text-red-700`
- Warning: `bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700`
- **Never** use `bg-green-500/10 border-green-500/30 text-green-400` (dark theme pattern)

### Tooltips
- Tooltips can stay dark: `bg-gray-800 text-white text-xs` (overlay exception)

### Code/Monospace
- `bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-blue-700 font-mono`

### Borders
- Card borders: `border-gray-200` (handled by Card component)
- Dividers: `border-gray-100` or `border-gray-200`
- **Never** use `border-gray-800` or `border-gray-700`

## Spacing

### Page Layout
- Page padding: `p-4 sm:p-6 md:p-8` (responsive)
- Max width: `max-w-4xl` (most pages) or `max-w-3xl` (narrow forms)
- Section gap: `space-y-6`

### Card Internal
- Card padding: default `p-6 pt-0` from CardContent
- Override for compact: `p-4`
- Grid gaps: `gap-3` (tight), `gap-4` (standard)
- Section margin: `mb-6`

## Selection/Active States
- Active tab/pill: `bg-blue-600 text-white`
- Inactive tab: `bg-gray-100 text-gray-600 hover:bg-gray-200`
- Selected option: `border-blue-500 bg-blue-50`
- Unselected option: `border-gray-200 bg-white hover:border-gray-300`

## Mobile
- Responsive grid: `grid-cols-1 md:grid-cols-2` or `grid-cols-2 sm:grid-cols-4`
- Touch targets: minimum `h-9` for interactive elements
- Font sizes don't go below `text-xs` on mobile
- Stack cards vertically on mobile with `grid-cols-1`

## Sidebar (Exception — stays dark)
- Background: `bg-gray-900`
- Text: `text-gray-400`, active: `text-white`
- This is intentional brand contrast
