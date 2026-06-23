# chizlab Admin Panel — UI Specification

> Extracted from live chizlab.uz brand + admin product requirements.
> All user-facing text is in **Uzbek**. All code/docs/comments are in English.
> Default theme: **light**. Dark surfaces apply to specific components only.

---

## 1. Design Token Reference

Tokens are defined in `design/design-tokens.css` (CSS custom properties) and
`design/design-tokens.ts` (Tailwind theme extension). This table is the quick
reference; the source files are authoritative.

### 1.1 Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#003837` | Sidebar bg, primary buttons, section headers |
| `--color-primary-dark` | `#002726` | Hover state for primary elements |
| `--color-primary-light` | `#004e4c` | Focus ring on dark surfaces |
| `--color-primary-muted` | `rgba(0,56,55,0.08)` | Subtle tinted hover rows, selected state bg |
| `--color-accent` | `#b8926a` | CTAs, active nav indicators, link hovers, badges |
| `--color-accent-dark` | `#9a7555` | Accent hover state |
| `--color-accent-light` | `#d4b090` | Disabled accent, decorative dividers |
| `--color-accent-muted` | `rgba(184,146,106,0.15)` | Accent highlight bg |
| `--color-bg` | `#fffff6` | Main page/panel background (warm off-white) |
| `--color-bg-elevated` | `#ffffff` | Cards, modals, dropdowns |
| `--color-bg-sunken` | `#f5f5e8` | Table zebra stripe, input bg |
| `--color-dark` | `#131313` | Body text, icon fill |
| `--color-dark-overlay` | `#0a0a0a` | Backdrop overlays |
| `--color-text-primary` | `#131313` | All body text |
| `--color-text-secondary` | `rgba(19,19,19,0.60)` | Labels, table sub-text |
| `--color-text-muted` | `rgba(19,19,19,0.40)` | Placeholder text, disabled |
| `--color-text-on-primary` | `#fffff6` | Text on primary-colored surfaces |
| `--color-border` | `rgba(19,19,19,0.12)` | Table dividers, input borders |
| `--color-border-strong` | `rgba(19,19,19,0.24)` | Focused input border, card separator |
| `--color-surface` | `#ffffff` | Card/dialog surface |
| `--color-surface-hover` | `#f8f8f0` | Row hover, menu item hover |
| `--color-focus-ring` | `#b8926a` | Keyboard focus outline (accent color) |

#### Status Badge Colors

| Status | Text Token | Bg Token | Hex |
|--------|-----------|---------|-----|
| `active` | `--color-status-active` | `--color-status-active-bg` | `#006b3c` on `#e6f4ed` |
| `pending` | `--color-status-pending` | `--color-status-pending-bg` | `#92550a` on `#fef3e2` |
| `draft` | `--color-status-draft` | `--color-status-draft-bg` | `#4a5568` on `#edf2f7` |
| `needs_review` | `--color-status-needs-review` | `--color-status-needs-review-bg` | `#9b2c2c` on `#fff5f5` |

All status badge combinations pass WCAG AA contrast (≥ 4.5:1 for normal text).

### 1.2 Typography Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--font-inter` | Inter, Inter Fallback, Arial | Primary UI font (all body, labels, inputs) |
| `--font-editorial` | PPEditorialNew, Georgia | Display headings, hero text (sparingly) |
| `--font-sf` | SFProDisplay, system-ui | Numeric data, statistics |
| `--text-xs` | 13px | Table sub-captions, helper text |
| `--text-sm` | 14px | Table cells, form labels |
| `--text-base` | 16px | Body text, input values |
| `--text-md` | 18px | Section sub-headings |
| `--text-lg` | 20px | Card titles |
| `--text-xl` | 24px | Page headings |
| `--text-2xl` | 36px | Screen titles (desktop) |
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Labels, nav items |
| `--font-weight-bold` | 700 | Headings, important values |

### 1.3 Spacing, Radius, Shadow

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 8px | Inputs, buttons, small cards |
| `--radius-lg` | 12px | Main cards, modals |
| `--radius-xl` | 16px | Large panels |
| `--radius-full` | 9999px | Pill status badges, avatar circles |
| `--shadow-card` | `0 2px 12px 0 rgba(0,56,55,0.07)` | Material cards, stat blocks |
| `--shadow-modal` | `0 20px 60px -10px rgba(0,0,0,0.25)` | Dialogs, drawers |
| `--shadow-lg` | Standard Tailwind lg shadow | Dropdown menus |

### 1.4 Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Button hover bg, icon color |
| `--duration-normal` | 200ms | Opacity transitions, focus rings |
| `--duration-slow` | 300ms | Modal enter/exit, sidebar expand |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | All standard transitions |

---

## 2. Brand Assets

All assets live in `apps/admin/public/brand/`.

| File | Description | Usage |
|------|-------------|-------|
| `logo.svg` | Full chizlab logo (dark version) | Header on light backgrounds |
| `logo-white.svg` | Full chizlab logo (white/inverted) | Sidebar (dark bg), login screen |
| `cursor.svg` | Custom cursor pointer image | Applied globally; see §4.4 |
| `click.svg` | Custom cursor active/click state | Applied globally; see §4.4 |
| `naqsh.svg` | Primary naqsh ornament | Page decorations, section dividers |
| `naqsh-about.svg` | Alternative naqsh (larger, about-page variant) | Login screen bg decoration |
| `loader.png` | Branded loader image | Loading states (full-page, skeleton replacement) |

---

## 3. Screen Inventory

### 3.1 Screen: PIN Login

**Route:** `/login`
**Purpose:** Single-admin authentication via 8-digit PIN.

#### Layout (desktop, centered)

```
┌─────────────────────────────────────────────┐
│  [naqsh-about.svg — decorative bg, opacity] │
│                                              │
│           [logo-white.svg — 120px wide]      │
│                                              │
│         Tizimga kirish  (heading)            │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │  PIN:  [ • ][ • ][ • ][ • ][ • ]…   │   │
│   │        (8 digit boxes, focused)       │   │
│   └──────────────────────────────────────┘   │
│                                              │
│         [  Kirish  ]  (primary button)       │
│                                              │
│   [Error/lockout message — red text]         │
└─────────────────────────────────────────────┘
```

**Background:** `--color-primary` (`#003837`) with `naqsh-about.svg` centered at
20% opacity — creates depth without cluttering the login form.

**Logo:** `logo-white.svg` centered above the card, 120px wide.

**PIN Input:**
- 8 individual single-digit input boxes, `width: 44px; height: 56px`
- Font: `--font-sf`, `--text-2xl`, `font-weight-bold`
- Background: `rgba(255,255,246,0.10)` (subtle light on dark)
- Border: `1px solid rgba(255,255,246,0.20)`, focused: `2px solid --color-accent`
- Letter-spacing: wide
- Digits masked (`type="password"` on each input) or show dots
- Auto-advance: focus moves to next box on digit entry
- Backspace: deletes and moves focus back

**Primary Button — "Kirish":**
- Background: `--color-accent` (`#b8926a`)
- Text: `--color-text-on-accent` (`#ffffff`), `--text-base`, medium weight
- Border-radius: `--radius-md`
- Padding: `11px 22px`
- Hover: `--color-accent-dark`
- Disabled (pin incomplete): `opacity: 0.5; pointer-events: none`
- Transition: `background-color 150ms ease`

**Error state:**
- Text: `rgba(255,100,100,0.9)` (visible on dark bg), `--text-sm`
- Displayed below the button
- Example messages (Uzbek): "Noto'g'ri PIN", "Urinishlar tugadi. 15 daqiqa kuting."

**Lockout state:**
- After N failed attempts the button becomes disabled and a countdown timer
  appears showing remaining lockout duration
- The PIN boxes are also disabled (`opacity: 0.5`)

**Mobile (≤ 430px):**
- Same layout, PIN boxes reduce to `width: 36px; height: 48px`
- Card fills 90vw

---

### 3.2 Screen: Materials Table

**Route:** `/materials`
**Purpose:** View, search, filter, sort, and paginate all materials.

#### Layout (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px, --color-primary bg)                             │
│  [logo-white.svg 100px]                                          │
│  Nav items:                                                      │
│    • Materiallar  [active, accent underline]                     │
│    • Kategoriyalar                                               │
│  ─────────────────────────────────────────────────────────────── │
│  HEADER (65px, white bg, bottom border)                          │
│  "Materiallar"  [h1]           [+ Yangi material] (CTA button)  │
│  ─────────────────────────────────────────────────────────────── │
│  FILTER BAR                                                      │
│  [🔍 Qidirish...]  [Kategoriya ▼]  [Status ▼]  [Teglar ▼]       │
│  ─────────────────────────────────────────────────────────────── │
│  TABLE                                                           │
│  ┌──────┬────────────────┬──────────────┬────────┬──────────┐   │
│  │ #    │ Sarlavha       │ Kategoriya   │ Status │ Harakat  │   │
│  ├──────┼────────────────┼──────────────┼────────┼──────────┤   │
│  │ ...  │ Material nomi  │ Chizmachilik │ [badge]│ ✏️ 🗑️    │   │
│  └──────┴────────────────┴──────────────┴────────┴──────────┘   │
│  [Pending AI indicator: "AI tahlil qilmoqda..." spinner]        │
│  ─────────────────────────────────────────────────────────────── │
│  PAGINATION                                                      │
│  ← Oldingi   1  2  3 …   Keyingi →   [10 ta / sahifa ▼]        │
└──────────────────────────────────────────────────────────────────┘
```

**Table columns:**

| Column | Width | Notes |
|--------|-------|-------|
| Title (`sarlavha`) | flex-1 | Truncated at 2 lines; tooltip on hover |
| Category (`kategoriya`) | 160px | Category name |
| Tags (`teglar`) | 180px | Up to 3 pill badges; "+N" overflow |
| Status | 140px | Status badge (see §1.1) |
| `isReady` | 60px | Check/pending icon |
| Actions | 80px | Edit (pencil), Delete (trash) icon buttons |

**Sort:** Click column headers for `sarlavha`, `createdAt`, `status`. Show
direction indicator (↑ / ↓). Only one active sort at a time.

**Filter bar:**
- Full-text search input: left icon (magnifier), placeholder in Uzbek
- Dropdowns: Kategoriya (tree-aware, shows path), Status (4 options), Teglar
  (multi-select combobox)
- Filters apply on change with 300ms debounce for search
- Active filters shown as dismissible chips below the bar

**Status Badge:**
- `border-radius: --radius-full`
- `padding: 3px 10px`
- `font-size: --text-xs; font-weight: --font-weight-medium`
- Colors from §1.1 status table

**AI Polling Indicator:**
- Appears as a slim banner above the table only when ≥1 material is `pending`
- Background: `--color-status-pending-bg`; text: `--color-status-pending`
- Rotating spinner icon + "AI tahlil qilmoqda..." text
- `refetchInterval: 5000ms` via TanStack Query (auto-stops when no pending items)

**Pagination:**
- Offset/limit pattern
- Page size selector: 10 / 25 / 50 options
- Show total count: "Jami 142 ta"

**Empty states:**
- No materials: illustration (naqsh.svg at 30% opacity) + Uzbek message + CTA
- No results for filter: different message + "Filtrlarni tozalash" link

**Mobile (≤ 430px):**
- Table collapses to card list view
- Each card shows title, category, status badge, edit/delete actions
- Filter bar collapses into a filter icon button that opens a drawer
- Pagination becomes prev/next only (page numbers hidden)

---

### 3.3 Screen: Create / Edit Material Form

**Route:** `/materials/new` and `/materials/:id/edit`
**Purpose:** Full CRUD form for a single material.

#### Layout (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: "Yangi material" / "Materialni tahrirlash"  [Bekor qilish] │
│  ─────────────────────────────────────────────────────────────── │
│  MAIN (2-column: form 60% | preview 40%)                        │
│                                                                  │
│  LEFT COLUMN (Form)           RIGHT COLUMN (Preview/meta)       │
│  ─────────────────────────    ──────────────────────────────     │
│  Sarlavha *                   [Media preview area]               │
│  [____________________________]  (image/video/pdf thumbnail)    │
│                                                                  │
│  Tavsif *                     AI holati:                        │
│  [________________________]   [pending | active | needs_review] │
│  [________________________]   badge + description               │
│  [________________________]                                      │
│                               Yaratilgan: 23.06.2026            │
│  Kategoriya *                 Yangilangan: 23.06.2026           │
│  [Kategoriyani tanlang ▼]                                        │
│                                                                  │
│  Teglar                                                          │
│  [tag1 ×] [tag2 ×] [+ Teg qo'shish]                             │
│                                                                  │
│  Media fayl *                                                    │
│  [    Fayl yuklash    ] (upload → returns URL)                   │
│  or  [____mediaUrl URL input____]                               │
│  [Upload progress bar]                                           │
│                                                                  │
│  Status                                                          │
│  ○ Qoralama  ● Faol  ○ Kutilmoqda  ○ Ko'rib chiqish kerak       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  [  Saqlash  ]          [  Bekor qilish  ]                       │
└──────────────────────────────────────────────────────────────────┘
```

**Form fields:**

| Field | Input type | Validation |
|-------|-----------|------------|
| `title` | text input | required, min 2 chars |
| `description` | textarea (plain text, no markdown) | required, min 10 chars |
| `categoryId` | tree-select dropdown | required |
| `tags` | combobox with chip creation | optional, max 20 tags |
| `mediaUrl` | file upload → returns URL + text input | required |
| `status` | radio group | required, one of 4 values |

**Media upload flow:**
1. User picks file from disk
2. `POST /api/admin/upload` returns `{ url: "https://minio.../..." }`
3. The URL is stored in the `mediaUrl` field — not the file blob
4. Show upload progress bar during upload (`0–100%`)
5. On success: show media preview (image thumbnail, video player stub, PDF icon)
6. `mediaUrl` text input is also editable directly (paste external URL)

**Media preview:**
- Images: `<img>` with `object-fit: cover`, max-height 240px
- Videos: `<video controls>` stub with poster frame
- PDFs: PDF icon + filename
- Other: generic file icon + filename

**Category tree selector:**
- Dropdown opens a panel showing the category tree
- Indent child categories visually (16px per level)
- Search input at the top of the dropdown
- Selected category shows full breadcrumb path: "Dizayn > UI/UX"

**Tags input:**
- Type and press Enter or comma to create a new tag chip
- Click × to remove a tag
- Suggest existing tags from API as user types

**AI status badge (edit view only):**
- Shows current `status` + `isReady` in a readonly summary card in the right column
- `pending`: spinner + "AI tahlil qilmoqda"
- `active + isReady`: check icon + "AI to'ldirdi" — fields may be AI-prefilled
- `needs_review`: warning icon + "Qo'lda to'ldiring"
- When fields are AI-prefilled, show a subtle "AI" chip next to the field label

**Validation:**
- React Hook Form + Zod schema
- Inline error messages below each field
- Submit button disabled while form is invalid or submitting
- On successful save: redirect to materials table with a success toast

**Mobile (≤ 430px):**
- Single-column layout (preview moves below form)
- Sticky save/cancel bar at bottom of viewport
- Media preview collapses to 160px height

---

### 3.4 Screen: Category Tree Manager

**Route:** `/categories`
**Purpose:** Create, rename, reorder (parent/child), and delete category nodes.

#### Layout (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER: "Kategoriyalar"            [+ Yangi kategoriya]         │
│  ─────────────────────────────────────────────────────────────── │
│  TREE VIEW                                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ▶ Chizmachilik                           [✏️] [+] [🗑️]  │  │
│  │    ▶ AutoCAD                              [✏️] [+] [🗑️]  │  │
│  │      • Asosiy kurslar                     [✏️] [+] [🗑️]  │  │
│  │    • SolidWorks                           [✏️] [+] [🗑️]  │  │
│  │  ▶ Dizayn                                 [✏️] [+] [🗑️]  │  │
│  │    • UI/UX                                [✏️] [+] [🗑️]  │  │
│  │  • AI                                     [✏️] [+] [🗑️]  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ─────────────────────────────────────────────────────────────── │
│  INLINE EDIT (appears in-place on edit click):                  │
│  [  Category name input  ]  [Saqlash]  [Bekor]                  │
└──────────────────────────────────────────────────────────────────┘
```

**Tree behavior:**
- Expand/collapse nodes with ▶ / ▼ toggle
- Depth indicator: 16px left-padding per level; max recommended depth: 3
- Each node row shows: expand icon, name, action buttons (Edit, Add child, Delete)
- Action buttons visible on row hover; always visible on mobile

**Inline rename:**
- Click edit icon → name text becomes an inline `<input>` in place
- Pressing Enter or clicking "Saqlash" saves
- Pressing Escape or "Bekor" discards

**Add child:**
- Click + button → new empty input row appears indented below the parent
- User types name and confirms

**Delete:**
- If category has children: show confirmation modal
  "Bu kategoriyada N ta bolasi bor. O'chirishdan oldin ularni ko'chiring."
- If category is in use by materials: show count + warning
- Soft-note: the API endpoint may refuse if materials are assigned (handle 409)

**Empty state:** "Hech qanday kategoriya yo'q" + create CTA

**Mobile (≤ 430px):**
- Identical structure, action buttons always visible (no hover dependency)
- Add/Edit forms appear as bottom drawers

---

## 4. Brand Application Rules

### 4.1 Logo

- `logo.svg` — used in the top-left of the page **header** on light/white surfaces
  - Width: `120px`; height: auto
  - Linked to `/materials` (home)
- `logo-white.svg` — used in the **sidebar** (dark `--color-primary` bg) and the **login screen**
  - Width: `100px` in sidebar, `120px` on login
  - No hover effect on logo itself

### 4.2 Naqsh Ornaments

Naqsh motifs are **decorative only** — they must never obscure content or slow
interaction.

| Asset | Where used | Treatment |
|-------|-----------|-----------|
| `naqsh-about.svg` | Login screen background | Centered, `opacity: 0.15–0.20`, `pointer-events: none`, `z-index: 0` |
| `naqsh.svg` | Empty state illustrations | Below message text, `opacity: 0.25–0.30`, max-width 200px |
| `naqsh.svg` | Section dividers (optional) | Between major page sections in the form, `opacity: 0.12`, 1px-ish height strip |

**Do not** place naqsh in table rows, inside form fields, or anywhere that
creates visual noise in data-dense views.

### 4.3 Loader

- `loader.png` is used as a **branded full-page loading indicator** when:
  - The app initializes (auth check, initial data fetch)
  - A heavy navigation transition is pending
- Centered in viewport on `--color-bg` background
- Animate with a gentle pulse: `opacity 0.6–1.0, 1.6s ease-in-out infinite`
  (mirrors `--animate-scroll-bounce` rhythm from chizlab.uz)
- Width: 80px (desktop), 60px (mobile)
- For smaller loading states (table refetch, form submit): use a spinner component
  using `--color-accent` color, not the loader.png

### 4.4 Custom Cursor

chizlab.uz hides the OS cursor (`cursor: none !important` on all elements) and
renders a custom SVG cursor via JavaScript.

- Apply the same pattern to the admin panel via a `<CustomCursor>` React component
- Default state: `cursor.svg` follows mouse position (absolute positioned, `z-index: --z-cursor`)
- Click state: swap to `click.svg` on `mousedown`, revert on `mouseup`
- On **touch/coarse pointer devices** (`@media (pointer: coarse)`): disable the
  custom cursor entirely and restore `cursor: auto` — exactly as chizlab.uz does
- The cursor component must never interfere with text selection or form interactions

### 4.5 Typography Hierarchy

| Use case | Font | Size | Weight |
|----------|------|------|--------|
| Page titles | Inter | `--text-2xl` (36px) | bold (700) |
| Section headings | Inter | `--text-xl` (24px) | bold (700) |
| Card/panel titles | Inter | `--text-lg` (20px) | medium (500) |
| Table headers | Inter | `--text-sm` (14px) | medium (500), uppercase, `--tracking-wider` |
| Table cells | Inter | `--text-sm` (14px) | normal (400) |
| Form labels | Inter | `--text-sm` (14px) | medium (500) |
| Form inputs | Inter | `--text-base` (16px) | normal (400) |
| Helper/error text | Inter | `--text-xs` (13px) | normal (400) |
| Status badges | Inter | `--text-xs` (13px) | medium (500) |

The **PPEditorialNew** serif font should be used only on the login screen heading
(brand moment) or for large display numbers. Do not use it for data/table views.

---

## 5. Responsive Rules

The admin panel is **desktop-first** but must be fully usable on mobile.

### 5.1 Breakpoints

| Name | Width | Behavior |
|------|-------|---------|
| `mobile` | ≤ 430px | Sidebar collapses to bottom nav or hamburger |
| `sm` | 640px | Minor layout adjustments |
| `md` | 768px | Two-column form layout available |
| `lg` | 1024px | Full desktop layout |
| `xl` | 1280px | Max content width cap (`--content-max-width`) |

### 5.2 Sidebar behavior

- **Desktop (≥ 768px):** Fixed sidebar, always visible, width `--sidebar-width` (240px)
- **Tablet (640–768px):** Sidebar collapses to icon-only (48px), expands on hover/focus
- **Mobile (≤ 430px):** Sidebar hidden; replaced by a bottom navigation bar with
  icon + label for the two main sections (Materiallar, Kategoriyalar), plus a
  hamburger menu for settings/logout

### 5.3 Primary actions in thumb-reach zones

On mobile (≤ 430px):
- Primary action buttons (create, save) placed at the **bottom** of the screen
  in a sticky bar, within 72px of the bottom edge
- Destructive actions (delete) require an extra confirmation step (not immediately
  reachable by accident)
- Table row actions use a swipe-to-reveal pattern or a ⋮ overflow menu

### 5.4 Touch target minimums

All interactive elements: minimum `44 × 44px` tap target on mobile.

---

## 6. Component Specifications

### 6.1 Button

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `--color-accent` | white | none | `--color-accent-dark` |
| Secondary | transparent | `--color-primary` | `1px solid --color-primary` | `--color-primary-muted` bg |
| Danger | transparent | `--color-status-needs-review` | `1px solid` | red tint bg |
| Ghost | transparent | `--color-text-secondary` | none | `--color-surface-hover` bg |

All buttons: `border-radius: --radius-md`, padding `11px 22px` (md), `8px 16px` (sm).
Transition: `background-color --duration-fast --ease-default`.

### 6.2 Input / Textarea

- Background: `--color-bg-elevated` (white)
- Border: `1px solid --color-border`
- Border-radius: `--radius-md`
- Padding: `10px 14px`
- Font: `--font-inter`, `--text-base`
- Placeholder: `--color-text-muted`
- Focus: border becomes `2px solid --color-focus-ring`, box-shadow: `0 0 0 3px --color-accent-muted`
- Error: border `2px solid --color-status-needs-review`, error message below in `--text-xs`
- Disabled: `background: --color-bg-sunken; opacity: 0.6`

### 6.3 Status Badge

```
border-radius: --radius-full
padding: 3px 10px
font-size: --text-xs
font-weight: --font-weight-medium
display: inline-flex; align-items: center; gap: 6px
```

Optionally include a colored dot (6px circle) before the label text.

### 6.4 Toast Notifications

- Position: top-right, 16px from edges
- Width: 320px max
- Background: `--color-surface`
- Border-left: `4px solid` (green for success, amber for warning, red for error)
- Shadow: `--shadow-lg`
- Auto-dismiss after 4s; manual close button
- `z-index: --z-toast`

### 6.5 Modal / Dialog

- Backdrop: `rgba(0,0,0,0.40)`, `z-index: --z-modal - 1`
- Dialog: centered, `border-radius: --radius-lg`, `--shadow-modal`
- Max-width: 560px (default), 800px (wide variant for forms)
- Enter animation: scale 0.95→1 + opacity 0→1, `--duration-slow`
- On mobile: full-screen bottom sheet instead of centered dialog

### 6.6 Sidebar Navigation

- Background: `--color-primary` (dark teal)
- Logo: `logo-white.svg` at top, `padding: 24px 20px`
- Nav items: `--color-text-on-primary`, `--text-sm`, medium weight
- Active item: `--color-accent` left border (3px), `--color-accent-muted` bg
- Hover: `rgba(255,255,246,0.06)` bg
- Logout button at bottom: ghost style on dark surface

---

## 7. Accessibility Notes

### 7.1 Contrast Ratios

All color combinations must meet **WCAG AA** (4.5:1 for normal text, 3:1 for large text/UI components).

Key pairs verified:
- `#131313` on `#fffff6`: ~18:1 — passes AAA
- `#fffff6` on `#003837`: ~14:1 — passes AAA
- `#b8926a` (accent) on `#ffffff`: ~3.3:1 — fails for small text; **do not use accent color for body text on white**. Use only for large text (≥18px bold), icons, and borders.
- Status badge combinations (§1.1): all pass AA at 13px medium weight

### 7.2 Focus States

- All interactive elements must have a visible focus indicator
- Default focus ring: `outline: 2px solid --color-focus-ring; outline-offset: 2px`
- Inside dark surfaces: `outline-color: --color-accent-light`
- Never use `outline: none` without providing a custom focus visible style

### 7.3 Keyboard Navigation

- Tab order follows logical DOM order (no `tabindex` jumps)
- Modal dialogs trap focus inside when open; restore focus on close
- Table: rows navigable with arrow keys after focusing the table
- PIN input: arrow keys navigate between digit boxes; Backspace deletes and moves back
- Tree view: arrow keys expand/collapse nodes and navigate up/down
- Dropdowns: Enter opens, Escape closes, arrow keys navigate options

### 7.4 Screen Reader Support

- All icon-only buttons have `aria-label` in Uzbek
- Status badges use `role="status"` or descriptive `aria-label`
- Live region `aria-live="polite"` on the AI polling indicator banner
- Form fields: explicit `<label for>` associations; error messages referenced via `aria-describedby`
- Custom cursor component: `aria-hidden="true"` on the cursor element

### 7.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* Loader.png pulse: replace with static display */
}
```

---

## 8. Performance Budget

The admin panel is used by a small number of admins but must remain fast:

- No CSS animations on data rows (table) — only on dedicated UI chrome
- Naqsh SVGs: inline or via `<img>` with explicit dimensions; never as background-image in tight loops
- `loader.png`: used only at full-page level; skeleton components (CSS shimmer) for table/list loading
- Lazy-load the media preview in the form (only load `<img>` when mediaUrl is set)
- Custom cursor: a single RAF loop, no extra DOM nodes per frame
