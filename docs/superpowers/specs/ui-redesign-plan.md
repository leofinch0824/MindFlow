# MindFlow UI Redesign Plan

## Overview

Redesign the MindFlow frontend to match the new "Digital Atelier" aesthetic defined in `ui_prototype/`. The new design features an editorial, sophisticated look with Material Design 3-inspired surfaces, Newsreader serif typography for headlines, and Manrope for body text.

## Design System Changes

### Color Palette (from ui_prototype)
| Token | Value | Usage |
|-------|-------|-------|
| primary | #0d4656 | Main brand color, CTAs |
| primary-container | #2c5e6e | Secondary brand |
| secondary | #5e5e5e | Muted text, icons |
| tertiary | #5d3813 | Accent highlights |
| background | #f9f9f7 | Page background |
| surface | #f9f9f7 | Card backgrounds |
| surface-container-low | #f4f4f2 | Sidebar, subtle backgrounds |
| surface-container-high | #e8e8e6 | Elevated surfaces |
| surface-container-highest | #e2e3e1 | Highest elevation |
| on-surface | #1a1c1b | Primary text |
| on-surface-variant | #40484b | Secondary text |
| outline | #71787c | Borders |
| outline-variant | #c0c8cb | Subtle borders |

### Typography
- **Headlines**: Newsreader (serif) - elegant, editorial feel
- **Body**: Manrope (sans-serif) - clean, modern readability
- **Labels**: Manrope uppercase with wide tracking

### Icons
- Material Symbols Outlined with specific weight settings

---

## Task Breakdown

### Phase 1: Design System Foundation

#### Task 1.1: Update tokens.css with new design tokens
- Replace old color tokens with new Material 3 surface-based palette
- Add new font families (Newsreader, Manrope)
- Add Material Symbols CSS configuration

#### Task 1.2: Create Sidebar component
- Fixed left sidebar (64px collapsed on mobile)
- Logo area: "The Digital Atelier" branding
- Navigation links with Material Symbols icons
- Active state with background highlight
- "New Insight" CTA button at bottom
- User profile section at bottom

#### Task 1.3: Create TopNav component
- Sticky header with backdrop blur
- Brand name "MindFlow" with italic serif styling
- Navigation tabs with active indicator
- Search input (hidden on mobile)
- User avatar

#### Task 1.4: Create MobileNav component
- Fixed bottom navigation for mobile
- 4 tabs: Briefing, Interests, Sources, Settings

### Phase 2: App Layout

#### Task 2.1: Update App.tsx
- Replace simple nav with Sidebar + TopNav layout
- Main content area with proper padding
- Mobile responsive: Sidebar → BottomNav

#### Task 2.2: Update index.css
- Remove old markdown styles (or update to new design)
- Add new animations and transitions
- Add custom scrollbar styles matching new palette

### Phase 3: Page Redesigns

#### Task 3.1: Newsletter page redesign
- Hero header with date and navigation arrows
- Main insight articles with:
  - Surface container backgrounds
  - Grayscale images with color on hover
  - Dialectical analysis expandables (Thesis/Antithesis/Synthesis)
- Exploration Zone grid (3 columns)
- Surprise Box section with tertiary background

#### Task 3.2: Interests page redesign
- Bento grid layout:
  - Left column: Analytics summary with icons
  - Right column: Interest cards with strength bars
- Interest cards showing:
  - Name with hover reveal for actions (freeze/delete)
  - Strength progress bar
  - Status (Main Channel, Background, Frozen)
- Emergent Patterns suggestions section

#### Task 3.3: Sources page redesign
- Status overview bento grid (Healthy Links, Latency, Critical Issues)
- Table-based source list with:
  - Source icon, name, feed URL
  - Type badges (RSS Feed, URL Scan, Social)
  - Status indicators with animated dots
  - Row hover reveals actions
- Quick add footer section

#### Task 3.4: Settings page redesign
- Settings header with serif typography
- Two-column layout:
  - Left: Configuration form with border-left accent
  - Right: System status bento cards
- System Vitality card with progress bars
- Surprise Discovery card with tertiary colors

### Phase 4: Component Updates

#### Task 4.1: InsightCard component
- Update to match new card style
- Add dialectical analysis expandable
- Grayscale image effect with color on hover

#### Task 4.2: InterestTagItem component
- Update to match new tag styling
- Add strength visualization
- Status badges (Main Channel, Background, Frozen)

---

## Technical Notes

### Dependencies
- `@fontsource/newsreader` or Google Fonts link
- `@fontsource/manrope` or Google Fonts link
- Material Symbols via Google Fonts CDN

### Mobile Breakpoints
- Mobile: < 768px (md) - Bottom nav, full-width content
- Desktop: ≥ 768px - Sidebar visible, bento grids

### Implementation Strategy
1. Start with tokens.css and CSS foundation
2. Create shared layout components (Sidebar, TopNav, MobileNav)
3. Update App.tsx with new layout shell
4. Implement each page one by one
5. Update shared components last

---

## Verification Checklist

- [ ] All pages render without errors
- [ ] Navigation works between pages
- [ ] Mobile responsive layout functions
- [ ] All icons display correctly
- [ ] Typography renders with correct fonts
- [ ] Color scheme matches design spec
- [ ] No console errors
- [ ] Build passes
