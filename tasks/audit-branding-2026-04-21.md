## Branding Audit — Cannabis Dispatch Sprint UI

Scope: `components/dashboard/client-tabs/dispatch-tab.tsx` (Copilot sub-view + whole file) and `components/dashboard/widget-builder-embedded.tsx` (Menu Integration tab + whole file).

### Red — Branding violations (fix before merge)

- **dispatch-tab.tsx:635** — Embed snippet uses dark-theme pattern `bg-gray-900 ... text-green-400` on page content. Replace with code/mono token: `bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-blue-700 font-mono`. (Note: this is pre-existing in dispatch-tab but wait — this line is actually in `widget-builder-embedded.tsx:635`, the Embed tab snippet.) **`widget-builder-embedded.tsx:635`**: `bg-gray-900 ... text-green-400` — BRANDING.md explicitly forbids `bg-gray-900` on content; use the code/monospace token.
- **widget-builder-embedded.tsx:681–685** — Phone mockup uses `border-gray-800 bg-gray-800` and `bg-gray-600`. This is a device-frame illustration, arguably a chrome overlay (like tooltip exception), but BRANDING.md lists no "device frame" exception. Acceptable only if kept strictly as the phone bezel; the inner widget preview must remain light. Verified the inner panel at line 687 is `bg-white` — OK, but flag the bezel for reviewer awareness.
- **dispatch-tab.tsx:927** — `bg-red-50/50` uses alpha suffix. BRANDING spec is `bg-red-50 border-red-200`. Replace `bg-red-50/50` → `bg-red-50`.
- **dispatch-tab.tsx:1604** — `bg-indigo-50/50` alpha suffix on rule card. Replace with `bg-indigo-50` or (preferred per BRANDING "Selected option") `border-blue-500 bg-blue-50`.
- **dispatch-tab.tsx:183, 705, 795, 1202** — Status text uses `text-green-600` / `bg-green-50`. BRANDING success token is `emerald`, not `green`. Replace `bg-green-50 text-green-600` → `bg-emerald-50 text-emerald-700`, and the bare `text-green-600` on save messages → `text-emerald-600`.
- **dispatch-tab.tsx:760, 867, 1225, 1609, 1652** — `text-green-500` on ToggleRight icons. Replace with `text-emerald-500` (or `text-emerald-600`).
- **dispatch-tab.tsx:1069** — `bg-green-50 text-green-700 border-green-200`. Replace with `bg-emerald-50 text-emerald-700 border-emerald-200`.
- **dispatch-tab.tsx:1084** — `text-green-500` on copy-confirm check. → `text-emerald-500`.
- **dispatch-tab.tsx:1464** — Driver dot `bg-green-400` → `bg-emerald-500`.
- **widget-builder-embedded.tsx:263, 639, 651, 696** — `bg-green-50 text-green-700 border-green-200` / `text-green-500` / `bg-green-400`. Replace `green` → `emerald` throughout.
- **widget-builder-embedded.tsx:1473** — `text-amber-600` chip uses `bg-amber-50` (OK) but token mismatch; spec calls for `bg-amber-100 text-amber-700` for chips. Tighten to `bg-amber-100 text-amber-700`. (dispatch-tab.tsx:1473 actually reads `bg-amber-50 text-amber-600` — replace with `bg-amber-100 text-amber-700`.)

### Yellow — Inconsistencies (acceptable but suboptimal)

- **Primary-button color split within dispatch-tab.tsx.** Indigo vs. blue is mixed in the same file:
  - `bg-indigo-600 hover:bg-indigo-700`: lines 370, 789, 1056, 1192, 712 (SaveButton).
  - `bg-blue-600 hover:bg-blue-700`: lines 618, 663 (Copilot Approve/Confirm).
  BRANDING.md permits either indigo (default `<Button>`) or blue, but says "pick ONE and stick with it." Recommend aligning Copilot Approve buttons to `bg-indigo-600` to match the rest of the file (9 indigo vs. 2 blue).
- **dispatch-tab.tsx — no `<Card>`/`<Button>`/`<Input>` primitives imported.** Every card is inline `rounded-xl border border-gray-200 bg-white` which matches the Card output spec, so acceptable. But all buttons and inputs are hand-rolled. Not a violation, but a large file that should migrate to primitives to stay consistent with widget-builder-embedded.tsx.
- **Focus rings inconsistent.** BRANDING.md: inputs → `focus:border-blue-500 focus:ring-1 focus:ring-blue-500`. dispatch-tab uses `focus:ring-2 focus:ring-indigo-500` on lines 784, 838, 1244, 1257, 1297, 1303, 1555 (and focus-within on 1368). Only the Copilot reject-reason textarea (line 647) uses the correct `focus:ring-1 focus:ring-blue-500`. Recommend standardizing to blue-500 ring-1.
- **Stat cards in OverviewView (lines 881–889)** do not follow the exact BRANDING stat-card spec (no `rounded-lg bg-{color}-50 p-2` icon container, uses `text-2xl` instead of `text-xl font-bold`). CopilotStat (lines 472–509) follows the spec correctly. Not a blocker, but OverviewView stat cards should match CopilotStat.
- **widget-builder-embedded.tsx:317, 324, 335, 341, 345, 393, 482, 493, 502, 513, 523, 617** — Inputs use `className="bg-gray-50"` to force a filled look. The `<Input>` primitive already has `bg-transparent`; `bg-gray-50` is a cosmetic override used consistently throughout the file, so it is self-consistent (not a violation), but divergent from dispatch-tab which uses white inputs. Flag for product decision.
- **widget-builder-embedded.tsx:345** — `<select>` element is raw HTML; BRANDING says "Custom selects: same pattern as textareas" — the class list matches (`border border-gray-200 bg-gray-50`) but lacks the required focus states (`focus:border-blue-500 focus:ring-1 focus:ring-blue-500`). Add them.
- **dispatch-tab.tsx:190–209** — Sub-navigation uses `bg-white text-gray-900 shadow-sm` for active tab instead of BRANDING spec `bg-blue-600 text-white`. This is a valid alternative pill pattern; acceptable but noting divergence.

### Green — Compliant (double-checked)

- **RecommendationRow risk chips (lines 529–534)** map `low → bg-emerald-100 text-emerald-700`, `medium → bg-amber-100 text-amber-700`, `high → bg-red-100 text-red-700` — exact BRANDING tokens.
- **CopilotStat (lines 497–508)** matches the stat-card reference spec exactly (`rounded-lg bg-{color}-50 p-2` + `text-xl font-bold text-gray-900` + `text-[11px] text-gray-400`).
- **Copilot connection-state dot (lines 352–358, 401–407)** uses `bg-emerald-500` / `bg-amber-500` / `bg-gray-300` — correct.
- **Copilot reject textarea (line 647)** uses the BRANDING-specified focus pattern.
- **Icon imports** — both files import exclusively from `lucide-react`. Confirmed.
- **No `text-white` leaks on page content** outside buttons/badges/tooltips/the phone-mockup header gradient (which is intentional branded header text on the widget preview).
- **No `border-gray-700`/`border-gray-800`** on content areas (only phone-mockup bezel).
- **Menu Integration info box (widget-builder-embedded.tsx:468)** `bg-emerald-50 border border-emerald-100 text-emerald-800` — close to BRANDING alert success (`bg-emerald-50 border-emerald-200 text-emerald-700`); acceptable, minor shade drift.
- **Empty states** have meaningful copy ("No recommendations — routes stable.", "No stores configured…", "Using industry defaults for {industry}").
- **widget-builder-embedded.tsx Save/Ready buttons** use `<Button>` primitive + `<Badge>` — compliant.

### Summary

**Total issues:** 11 blocking (green→emerald migration + alpha suffixes + bg-gray-900 code block), 6 minor (button color split, focus-ring inconsistency, stat-card mismatch, input fill overrides, select focus states, sub-nav pill style).

**Estimated fix effort:** ~25 minutes.
- 10 min: global `green-{50,100,200,400,500,600,700}` → `emerald-*` sweep in `dispatch-tab.tsx` and `widget-builder-embedded.tsx` (~15 occurrences).
- 5 min: two `/50` alpha suffixes and the one `bg-gray-900`/`text-green-400` embed-code block.
- 5 min: align Copilot Approve/Confirm buttons from `bg-blue-600` → `bg-indigo-600` for intra-file consistency.
- 5 min: add `focus:border-blue-500 focus:ring-1 focus:ring-blue-500` to the raw `<select>` at line 345 of widget-builder-embedded.tsx, and standardize dispatch-tab input focus rings.

The Copilot sub-view itself (the main new surface) is largely BRANDING-compliant — the violations are overwhelmingly pre-existing `green-*` drift in the surrounding file, plus the widget-builder's Embed tab dark code block.
