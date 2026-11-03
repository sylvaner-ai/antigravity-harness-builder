---
trigger: glob
description: Règle des 5 états UI, respect des tokens visuels et conformité WCAG AA
globs: "**/*.{tsx,jsx,vue,svelte,html}"
---

# Directives Craft UI, Design Tokens & Règle des 5 États

## 1. Règle Obligatoire des 5 États UI
Tout composant ou vue présentant des données asynchrones ou persistées doit explicitement gérer 5 états :
1. **État Normal (Data) :** Rendu fluide avec les données complètes.
2. **État Chargement (Loading Skeleton) :** Skeletons animés reproduisant fidèlement la forme du contenu (bannir le spinner brut au centre).
3. **État Vide (Empty State) :** Illustration sobre, message explicatif clair et bouton d'action pertinent.
4. **État Erreur (Error Boundary) :** Message compréhensible sans jargon technique et bouton de réessai.
5. **État Feedback Optimiste / Toast :** Confirmation immédiate des actions utilisateurs.

## 2. Respect des Tokens Visuels & Anti-Valeurs Magiques
- Utiliser exclusivement les tokens du Design System (spacing, colors, typography).
- Proscrire les valeurs CSS arbitraires non justifiées.
- Maintenir une cohérence totale entre les espacements et les rayons de bordure.

## 3. Accessibilité & Finitions
- Contraste de texte WCAG 2.1 AA (minimum 4.5:1).
- Navigation clavier intégrale avec anneau de focus net (focus-visible).
- Zéro bouton factice : interdiction des gestionnaires d'événements onClick vides ou TODO.
