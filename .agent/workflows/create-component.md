---
description: Create a new UI component strictly adhering to the Sophia Design System
---

1. **Scaffold**:
   - If a `shadcn/ui` primitive exists, add it first: `npx shadcn@latest add [component-name]`.
   - If custom, create file in `components/ui/[name].tsx`.
2. **Apply Typography**:
   - If the component displays *content* (Philosopher/Text), apply `font-serif`.
   - If the component is *UI/Controls* (Button/Input), apply `font-sans`.
3. **Apply Theming**:
   - Remove standard rounded-md/shadow-sm if they look too "SaaS".
   - Use `border-stone-200` or `bg-[#F9F8F4]`.
   - Ensure `dark` mode compatibility uses deep charcoal, not pure black.
4. **Interactive States**:
   - Hover/Focus effects should use the "Philosopher’s Blue" (`text-violet-900` or `ring-violet-900`) only sparingly.
5. **Export**:
   - Ensure the component is exported from `index.ts` (if applicable) or properly named for auto-import.