# Lectern — Learning Management System Template

A responsive LMS template built with React 19, TypeScript, Vite and Tailwind CSS 4. It has student, instructor and administrator experiences that all run on one consistent demo data set (the fictional **Northfield Institute**).

> **Status:** work in progress. All pages are built, and the type check, production build and 16 business-rule unit tests pass. The Playwright end-to-end specs in `tests/e2e/` are written but **haven't been run yet**.

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # type check + production build
npm run test:unit      # business-rule tests (no browser)
npm run test:install && npm run test:e2e   # end-to-end tests (build + preview)
```

Use **Demo accounts** in the header, or the account menu, to switch between a student (Maya Patel), instructors and administrators.

## Features

- **Public site:** a landing page whose content admins can edit, a catalog with search, filters, sorting and "load more", course pages with preview lessons, and certificate verification.
- **Students:**
  - Dashboard with stats, continue learning, an activity chart, tasks, rule-based recommendations, achievements and a weekly goal.
  - Lesson player for video, text, PDF, link and quiz lessons, with notes, bookmarks, Q&A and resources.
  - Quizzes with a timer, attempt limits, review rules and manual grading, plus assignments, a calendar, history, certificates, notifications, profile and settings.
- **Instructors:**
  - Dashboard and analytics.
  - Course builder covering basics, curriculum reordering and publication with review.
  - Lessons, enrollments, quiz builder and question bank, assignments and grading, and announcements.
- **Admins:**
  - Grouped navigation.
  - Academic years, terms, faculties and departments.
  - Subjects, with a list page offering filters, bulk actions and CSV export, and a detail page with 8 tabs.
  - Categories, groups and batches.
  - Users, plus roles and permissions.
  - Grades, certificates (issue, revoke, reinstate), reviews, reports, the activity log and platform settings.
  - **Theme & Branding:** presets, a color editor with hex and HSL input, light and dark palettes, live preview, and save / discard / reset.
  - **Website Appearance**, **Navigation & Menus** and **Demo Data** (backup and reset).

## Architecture

- `src/types`: the domain model.
- `src/data`: seed content plus a generator that is deterministic and dates everything relative to today.
- `src/services`: pure business rules for progress, assessment, analytics, permissions, theme and tasks. These are unit-tested.
- `src/state`: the store. `actions.ts` validates every change; `store.tsx` holds state and persists it.
- `src/features/*`: the pages.
- `src/components/*`: shared UI, including the hand-rolled SVG charts.

The theme is a set of CSS variables generated from `services/theme.ts`; derived shades are mixed in `styles/index.css`.

## Demo limitations (production needs a backend)

- **No real security.** Data, roles and permission checks all live in the browser (localStorage), and role switching is not authentication. A real deployment must enforce permissions, quiz timing and attempt limits on a server.
- **Payments:** none are taken.
- **Attachments:** only file names are recorded. Logos and avatars are stored as local data URLs.
- **Notifications:** in-app only.
- **Certificate IDs** are generated in the browser. They are not tamper-proof credentials.
- **Video lessons** show a labeled placeholder until a URL is set.
