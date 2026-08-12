---
name: Stitch Translate
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424754'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  container-width: 360px
---

## Brand & Style
The design system is built on a **Tech Minimalist** foundation, prioritizing speed of comprehension and utility. As a browser extension, the interface must feel like a native enhancement of the user's workflow—unobtrusive yet powerful. 

The personality is **Reliable, Fast, and Intelligent**. To achieve this, the system employs a high-density layout with generous white space, ensuring that even complex translation data remains legible. The aesthetic avoids unnecessary decoration, focusing instead on clear information hierarchy and precise interactive states.

## Colors
The palette is anchored by **Translate Blue**, a vibrant and high-contrast primary color used for actions and brand presence. 

- **Primary (#3B82F6):** Used for primary buttons, active toggles, and key highlights.
- **Secondary (#6366F1):** An indigo-leaning tint used for secondary information or specific "intelligence" features like AI-powered context.
- **Neutrals:** A scale of Slate Grays. `Slate-900` (#0F172A) for primary headings, `Slate-600` (#475569) for body text, and `Slate-50` (#F8FAFC) for container backgrounds.
- **Surface:** Pure white (#FFFFFF) is reserved for the topmost interactive layers (popups and cards) to create a clear distinction from the browser background.

## Typography
This design system utilizes **Inter** for all roles. Inter’s tall x-height and clear apertures make it the ideal choice for small-scale UI like browser popups and sidebars.

- **Headlines:** Uses a medium weight with slight negative letter-spacing to appear tighter and more professional.
- **Body:** Standardized at 14px for general reading, dropping to 13px for dense translated blocks to maximize screen real estate.
- **Labels:** Used for metadata (language types, timestamps, or shortcuts). Uppercase labels are used sparingly for section headers within the extension menu.

## Layout & Spacing
The layout follows a **4px base grid**. Given the constraints of browser extensions (popups and sidebars), the philosophy is one of **Compact Utility**.

- **Popup Width:** Fixed at 360px to ensure consistency across Chrome/Edge/Firefox.
- **Margins:** Standard 16px internal padding for the main container, with 12px gutters between logical groups of elements.
- **Sidebars:** Fluid width (20% to 30%) but with a 320px minimum.
- **Stacking:** Elements use a vertical stack with 8px spacing for related items and 16px spacing for distinct sections.

## Elevation & Depth
Elevation is used to distinguish the extension UI from the underlying webpage content.

- **Level 1 (Surface):** Default background for the popup. Uses a 1px `Slate-200` border.
- **Level 2 (Floating):** Used for tooltips or "hovering" translation icons. Employs a subtle, diffused shadow: `0 4px 12px rgba(0, 0, 0, 0.08)`.
- **Level 3 (Overlay):** Used for modals within the extension. Deep shadow: `0 12px 32px rgba(0, 0, 0, 0.12)`.

All elevated surfaces should utilize a subtle `0.5px` inner white stroke on their top edge to simulate a modern, crisp light source.

## Shapes
The shape language is modern and approachable. 
- **Standard UI (Buttons, Inputs):** 8px (`rounded-md`) creates a professional look that isn't overly aggressive.
- **Containers (Popups, Cards):** 12px (`rounded-lg`) provides a soft frame for the content.
- **Status Indicators (Language Badges):** 4px (`rounded-sm`) to maintain structure at very small sizes.

## Components
- **Buttons:** Primary buttons use the Translate Blue background with white text. Secondary buttons use a light gray background (`Slate-100`) with `Slate-900` text. All buttons have a transition duration of 150ms.
- **Input Fields:** Search and translation inputs use an 8px radius with a `Slate-200` border. On focus, the border shifts to `Primary-Blue` with a 2px soft outer glow.
- **Language Chips:** Small, 4px rounded badges used to indicate "From" and "To" languages. They use a subtle `Secondary-Indigo` tint for visibility.
- **Icon Navigation:** Located at the bottom or top of the popup. Icons are 20px in size, colored `Slate-400` when inactive and `Primary-Blue` when active.
- **Translation Cards:** Each saved translation is a white card with a subtle 1px border. Hovering over a card increases the shadow depth slightly to indicate interactivity.
- **Floating Action Button (FAB):** A small circular button (32px) that appears on selected text in the browser. It is pure white with the Primary-Blue icon and a Level 2 shadow.