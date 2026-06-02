# MacroTrack Frontend — Developer Guide

This is the React 19 single-page application (SPA) providing the complete user interface for MacroTrack. It enables users to register, log their food diary, track active workouts and hydration, monitor weight progress, and view weekly metrics calculated by the AI coach.

---

## Quick Start

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Set up environment variables
# Create a .env file in the frontend/ folder with:
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id

# 3. Start the development server
npm start
# Opens http://localhost:3000 in your browser
# Hot-reloads when you save files
```

---

## Folder Structure

```
frontend/src/
├── features/      ← User-facing features and pages
├── shared/        ← Reusable UI components used across multiple pages
├── pages/         ← Static/informational pages (landing page, guides)
├── api/           ← HTTP API services connecting to the Django backend
├── context/       ← Global React context providers (auth, theme, units)
├── hooks/         ← Custom React hooks
├── utils/         ← Helper utility functions
├── styles/        ← Central CSS styles and theme assets
├── App.js         ← Core root router and provider registration
└── index.js       ← Entry point mounting React into the DOM
```

### Feature Folders Breakdown

| Folder | UI & Functionality |
|---|---|
| `features/auth/` | Login, sign up, password resets, email OTP validation, Google sign-in button |
| `features/dashboard/` | Daily calorie ring, macro progress bars, meal totals, quick logged indicators |
| `features/diary/` | Date navigators, meal category grids (breakfast, lunch, dinner, snack), meal log managers |
| `features/foods/` | Food database search page, custom food creators, recent/favorites listings |
| `features/progress/` | Weight logs, trend charts, goal trackers, BMI charts |
| `features/exercise/` | Active workout log list, add exercise forms, calorie burned statistics |
| `features/recipes/` | Saved recipes builder, log-recipe-as-meal action |
| `features/coach/` | Weekly check-in forms, target rate adjustments, AI coach feedback |
| `features/reports/` | Dynamic calorie adherence trends, macro breakdown charts |
| `features/profile/` | Profile picture adjustments, biometrics editors, custom nutrition goals |

---

## API Communication Structure

All network requests communicating with the Django API are grouped within `src/api/`. Each file manages operations for its respective feature.

### Endpoint Configuration Example

```javascript
// src/api/mealService.js
import { API_ENDPOINTS, getHeaders } from './config';

// Create a new meal record
export const createMeal = async (mealData) => {
  const response = await fetch(API_ENDPOINTS.MEALS, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(mealData),
  });
  if (!response.ok) throw new Error('Failed to create meal log');
  return response.json();
};
```

---

## Global State (Auth Context)

Authentication and user sessions are managed globally in `src/context/AuthContext.js`. This exposes simple states and login/logout functions to the entire component tree.

- Tokens are securely saved under the `authToken` key in `localStorage`.
- Pages that require authentication are wrapped by a `<ProtectedRoute>` wrapper, which automatically intercepts requests and routes unauthenticated sessions to `/login`.

---

## Common Dev Operations

### Running the App
```bash
npm start          # Dev server running on http://localhost:3000
```

### Production Build
```bash
npm run build      # Bundles optimized production assets into build/
```

### Running Tests
```bash
npm test           # Launches interactive Jest test runner
```
