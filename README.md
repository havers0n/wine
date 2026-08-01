# MAGOF Planner

MAGOF is a planning and team-assignment interface for vineyard sampling work. It complements AKOLogic: MAGOF organizes days, teams, stops, and assignments, while AKOLogic remains responsible for field navigation, sample execution, weights, labels, and laboratory operations.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000`.

## Verification

```bash
npm run check
```

This runs strict TypeScript checking followed by a production build.
