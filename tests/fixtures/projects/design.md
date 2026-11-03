# Style Reference & Design Tokens
> Theme: light | Base philosophy: hairline borders on rice paper

## Tokens — Colors (CSS Variables Mapping)
| Role / Semantic Token | Value | CSS Variable | Description |
|-----------------------|-------|--------------|-------------|
| Background Canvas | #ffffff | `--color-canvas` | Fond principal de l'application (base pure) |
| Surface Alt / Paper | #f5f5f5 | `--color-surface-alt` | Panneaux imbriqués, cartes secondaires, hover |
| Border Default | #e5e5e5 | `--color-border` | Bordures fines structurelles 1px (au lieu d'ombres) |
| Border Strong | #d4d4d4 | `--color-border-strong` | Séparateurs d'emphase et contours marqués |
| Foreground Default | #171717 | `--color-foreground` | Titres et texte principal (Charcoal adouci) |
| Foreground Muted | #737373 | `--color-foreground-muted` | Texte secondaire, labels estompés, placeholders |
| Primary Action Fill | #0a0a0a | `--color-primary` | Fond du bouton d'action principal haute emphase |
| Primary Action Text | #ffffff | `--color-primary-foreground` | Texte du bouton d'action principal |
| Brand Accent | #2563eb | `--color-accent` | Electric Blue pour liens, états actifs et indicateurs |
| Deep Action Accent | #1e40af | `--color-accent-deep` | Deep Sapphire pour action d'engagement prioritaire |
| Accent Muted Wash | #dcfce7 | `--color-accent-soft` | Fond teinté vert pastel pour badges de statut |

## Tokens — Typography
- **Display Headlines (36px+)** : `var(--font-display)`, graisse 500 (moyen, non gras).
- **Body & Interface (<=30px)** : `var(--font-sans)`, graisse 400 (corps 16px) et 500 (labels/boutons).
- **Code & Données techniques** : `var(--font-mono)`, graisse 400 (12-14px).

## Tokens — Radii
- `--radius-tag`: 9999px (Pill tags, badges, boutons ghost nav)
- `--radius-card`: 12px (Cartes produit, surfaces de tableau de bord)
- `--radius-largecard`: 16px (Grandes cartes showcase et cadres mockup)
- `--radius-button`: 8px (Boutons d'action)
- `--radius-input`: 6px (Champs de formulaire avec contour 1px)

## Invariants de Style
1. **Élévation Border-First** : Découpage strict via bordures 1px `#e5e5e5` (`var(--color-border)`). Les ombres portées lourdes sont interdites.
2. **Discipline des Rayons** : Respect exclusif des 5 rayons (9999px, 16px, 12px, 8px, 6px).
3. **Hiérarchie d'Action** : Un seul bouton d'action principal (`--color-primary` ou `--color-accent-deep`) par écran. Les actions secondaires adoptent un fond blanc et une bordure 1px.
