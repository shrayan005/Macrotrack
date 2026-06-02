# MacroTrack — Personal Nutrition & Macro Tracker

MacroTrack is a full-stack web application designed to help users seamlessly track their daily food intake, macronutrients, calories, exercise, water consumption, and weight goals. It features an **AI Coach** that analyzes user progress weekly and recommends custom calorie adjustments to help them hit their fitness goals.

---

## Table of Contents

1. [What Does This App Do?](#what-does-this-app-do)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [API Overview](#api-overview)
8. [Architecture Decisions](#architecture-decisions)

---

## What Does This App Do?

MacroTrack is a personalized health and nutrition tracker. Users can:

- **Log meals** by searching a comprehensive database of 300,000+ foods using the FatSecret API
- **Track calories and macros** (protein, carbs, fat, fiber) on a daily basis
- **Log exercise and water** intake to stay active and hydrated
- **Track their weight** over time with detailed charts, trends, and projections
- **Get AI coaching** — the application analyzes your weight change and calorie adherence weekly, recommending adjustments to your calorie target
- **Save recipes** for meals they eat often, allowing one-tap logging
- **See reports** with weekly patterns, macronutrient breakdowns, and adherence insights

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 6, Recharts |
| **Backend** | Django 4.2, Django REST Framework |
| **Database** | PostgreSQL |
| **Food Data** | FatSecret API (nutrition database) |
| **Auth** | Token-based + Google OAuth |
| **Icons** | Lucide React |
| **Charts** | Recharts |

---

## Project Structure

```
MacroTrack/
│
├── backend/                      ← Django REST API (Python)
│   ├── accounts/                 ← User accounts, OTP auth, onboarding & OAuth
│   ├── api/                      ← Core tracker features
│   │   ├── foods/                ← Food search & custom foods
│   │   ├── meals/                ← Meal diary CRUD & calculations
│   │   ├── exercise/             ← Exercise logging
│   │   ├── weight/               ← Weight logging & statistics
│   │   ├── recipes/              ← Saved meal templates
│   │   ├── diary/                ← Water intake & daily notes
│   │   ├── coach/                ← AI weekly coaching recommendations
│   │   ├── analytics/            ← Analytics & reports
│   │   └── urls.py               ← API route mapping
│   ├── macrotrack_api/           ← Django project configuration (settings.py, urls.py)
│   ├── requirements.txt          ← Python package dependencies
│   └── .env                      ← Local environment variables (git-ignored)
│
└── frontend/                     ← React Single Page Application (SPA)
    ├── src/
    │   ├── api/                  ← HTTP service layers connecting to backend
    │   ├── context/              ← Auth & Theme global React context
    │   ├── features/             ← Component folders grouped by feature
    │   │   ├── auth/             ← Login, sign up, password reset, OTP verification
    │   │   ├── dashboard/        ← Daily overview & quick actions
    │   │   ├── diary/            ← Food diary logging
    │   │   ├── foods/            ← Food search & custom food management
    │   │   ├── exercise/         ← Exercise logging
    │   │   ├── recipes/          ← Saved recipes
    │   │   ├── coach/            ← AI coaching dashboard & weekly check-in
    │   │   ├── progress/         ← Weight & goal progression
    │   │   ├── reports/          ← Analytics charts & logs
    │   │   └── profile/          ← Settings & preference configurations
    │   ├── shared/               ← Reusable layout & routing guards
    │   ├── pages/                ← Static pages (Landing page, privacy guide)
    │   ├── hooks/                ← Custom utility React hooks
    │   ├── utils/                ← Helper utilities
    │   └── App.js                ← Route declarations & app shell
    └── package.json              ← Frontend dependencies & scripts
```

---

## Features

### 1. Authentication & Onboarding
Users can register with an email and verify via a secure One-Time Password (OTP) or log in using Google OAuth. An onboarding flow guides users to input their biometrics (age, gender, height, current weight) and fitness goals to estimate their baseline Total Daily Energy Expenditure (TDEE).

### 2. Food Database & Search
Search through a rich database of 300,000+ foods integrated with the FatSecret API. Filter by food category or create your own custom foods with detailed macronutrient properties.

### 3. Meal Diary
Log daily intake across Breakfast, Lunch, Dinner, and Snacks. Users have precise serving size controls, the ability to duplicate/move meals, and quick-add actions to log custom calories instantly.

### 4. AI Coach
Weekly coaching check-in dashboard. The app aggregates your logged weight and calorie adherence over the course of the week, compares it to your target rate of weight change, and calculates recommended adjustments to your calorie budget.

### 5. Weight & Goal Tracking
Log weight daily to visualize trends over time. The dashboard computes key indicators like current TDEE estimations, goal projection dates, and weight changes.

### 6. Exercise & Water Tracking
Log workouts with durations and estimated calories burned. Track daily water intake (in ml or cups) using a sleek interactive hydration interface.

### 7. Saved Recipes
Create recipes combining multiple food items. Log complete meals in a single click by adding standard or customized servings of saved recipes to your daily diary.

### 8. Analytics & Reports
Visualize progress using dynamic interactive charts powered by Recharts. See weekly calorie trends, macronutrient ratios (protein, carbs, fat, fiber), day-of-week caloric patterns, and target adherence metrics.

---

## Getting Started

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 14+
- **FatSecret API** credentials (obtainable via the FatSecret Developer Portal)
- **Google OAuth** credentials (optional, for Google Login integration)

---

### Backend Setup

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up local environment variables:**
   Copy the example environment file and configure your values:
   ```bash
   cp .env.production.example .env
   ```
   *Open `.env` and fill in database configurations, FatSecret keys, and secrets (see [Environment Variables](#environment-variables) below).*

6. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```

7. **Create a superuser (for admin access):**
   ```bash
   python manage.py createsuperuser
   ```

8. **Start the development server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *The backend server runs locally at `http://localhost:8000`.*

---

### Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install node dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   *The React application will launch at `http://localhost:3000`.*

---

## Environment Variables

Create `backend/.env` containing the following keys:

```env
# Django core settings
SECRET_KEY=your-long-random-secure-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database configuration (PostgreSQL)
DB_NAME=macrotrack_db
DB_USER=macrotrack_user
DB_PASSWORD=your-strong-password
DB_HOST=localhost
DB_PORT=5432

# CORS & Frontend URLs
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Field encryption key (needed for secure sensitive tokens)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FIELD_ENCRYPTION_KEY=your-generated-key

# FatSecret API (for food searches)
FATSECRET_CONSUMER_KEY=your-fatsecret-key
FATSECRET_CONSUMER_SECRET=your-fatsecret-secret

# Google OAuth (Optional — for Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email setup (prints to console in local development by default)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=MacroTrack <noreply@macrotrack.com>
```

---

## API Overview

All API endpoints are prefixed with `/api/`. The following table summarizes key routes:

| Group | Base Path | Description |
|---|---|---|
| **Auth** | `/api/auth/` | OTP verification, Login, Sign up, Google OAuth, Password Reset |
| **Foods** | `/api/foods/` | Search foods database, custom food actions, recent foods list |
| **Meals** | `/api/meals/` | Meal diary logs CRUD operations |
| **Weight** | `/api/weight-logs/` | Weight trackers and statistics endpoints |
| **Exercise** | `/api/exercise-logs/` | Daily exercise logs and summaries |
| **Water** | `/api/water-logs/` | Interactive water logging operations |
| **Recipes** | `/api/recipes/` | Create and log custom recipes |
| **Coach** | `/api/coach/` | Weekly AI coach check-ins and adjustment feedback |
| **Reports** | `/api/reports/` | Calorie and macro analytics generators |
| **Progress** | `/api/progress/` | Dashboard statistic overview summaries |
| **Daily Notes** | `/api/daily-notes/` | Day logs and activity tracker notes |

---

## Architecture Decisions

### 1. Token-Based Authentication (DRF Token Auth)
We selected token-based authentication because it is stateless, resilient, and integrates cleanly with React SPAs. Authorization headers store and pass the tokens securely, eliminating complex CSRF configurations required for session-based cookies.

### 2. Denormalized Meal Nutrition Totals
For high performance on dashboard loads, daily nutrient totals are cached on the `Meal` record (`total_calories`, etc.) rather than calculated recursively from `MealFood` rows. These cache columns are dynamically recalculated inside a database transaction whenever foods are modified, added, or removed.

### 3. Soft Deletes for Users
To prevent database orphans and preserve historical macro analytics for aggregate reports, user deletion utilizes a soft delete strategy. Toggling `User.is_deleted = True` deactivates access while preserving database schema integrity.
