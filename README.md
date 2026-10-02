# RLEAMS v1: Robotics Lab Equipment & Asset Management System

Track robots, sensors, controllers and tools in a robotics lab: who has what, where it lives, what is overdue, and what is in maintenance.

**v1 is the portfolio edition.** It runs entirely on free tiers (GitHub Pages + Supabase) with no server to maintain. v2 is the lab-grade version (see roadmap).

## Features
- Asset inventory with tag, category, location and status (Available, Checked out, Maintenance, Retired)
- Check-out / check-in with person and due date, with overdue detection
- Search and filter by category and status
- Activity log of every change
- CSV export
- Responsive, keyboard-friendly, light/dark theme
- **Two modes, same code:** demo mode (browser localStorage, zero setup) and live mode (Supabase Postgres)

## Stack
| Layer | Choice | Cost |
|---|---|---|
| Frontend | Vanilla HTML, CSS and JavaScript (no build step) | Free |
| Hosting | GitHub Pages | Free |
| Database + API | Supabase (Postgres + auto REST) | Free tier |

## Project structure
```
rleams/
├── index.html   markup
├── style.css    styles (light/dark theme)
├── app.js       data layer (localStorage / Supabase), rendering, events
├── schema.sql   Supabase tables, constraints, RLS, sample data
└── README.md
```

## Run it
**Demo mode:** open `index.html`. Data is saved in your browser.

**Live mode:**
1. Create a free project at supabase.com.
2. Run `schema.sql` in the SQL Editor.
3. In `app.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Project Settings > API). The badge in the header changes to "live · Supabase".
4. Push to GitHub, then Settings > Pages > deploy from `main`.

## Design notes (talking points for interviews)
- A small `store` data layer exposes `load / upsert / remove`; swapping localStorage for Supabase changes nothing in the UI code.
- Status is constrained at the database level with a `check` constraint, and asset tags are unique.
- Every mutation writes an `activity` row, giving an audit trail.
- User-supplied text is HTML-escaped before rendering.
- The anon key is public by design; security comes from Row Level Security. v1 uses open demo policies with fake data, which is a known limitation.

## Roadmap (v2)
Authentication and roles (admin, technician, student), per-user RLS, QR/barcode labels, reservations and calendar, maintenance schedules and calibration reminders, photo uploads, email alerts, and a proper backend (FastAPI + PostgreSQL) with tests and CI.

## License
MIT
