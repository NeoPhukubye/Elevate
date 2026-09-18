# Elevate

A workforce-readiness companion that helps young people bridge the gap between education and employment.

Users explore career pathways, practise realistic workplace scenarios, receive AI feedback, track their progress, and build an evidence portfolio — all before securing their first opportunity.

## Features

- **Global Career Pathways** — explore careers and industries worldwide.
- **Accessible & Disability-Friendly** — screen-reader support, keyboard navigation, adjustable text size, high contrast, captions/transcripts, reduced motion, and simple language.
- **Personalised Learning** — recommendations based on interests, goals, skills and experience.
- **Realistic Workplace Scenarios** — practise interviews, meetings, teamwork, communication, problem-solving, conflict resolution, customer service and more.
- **AI Feedback & Coaching** — after each scenario, the AI explains what went well, what could improve and how to try again.
- **Progress Dashboard** — charts and text summaries for communication, teamwork, problem-solving, adaptability and time management.
- **Professional Profile Integration** — connect GitHub, LinkedIn and CV, plus certificates, qualifications and projects.
- **Readiness Portfolio** — evidence of completed scenarios, skills practised, feedback and progress.
- **Personal Development Recommendations** — the platform identifies areas needing more practice.
- **Privacy & User Control** — users decide what personal information and professional evidence to share.

## Architecture

- **Frontend** — static single-page app (HTML, CSS, vanilla JS modules) served via GitHub Pages.
- **Backend** — Node.js + Express + TypeScript + Prisma (PostgreSQL) deployed on Render.com.
- **AI Coach** — Google Gemini (`@google/generative-ai`).

## Getting Started

### Backend (Render.com)

1. Copy `.env.example` to `.env` and fill in real values.
2. Set up a PostgreSQL database:
   ```bash
   npx prisma db push
   npx prisma generate
   npx prisma seed
   ```
3. Start the server:
   ```bash
   npm install
   npm run dev
   ```
4. The API is available at `http://localhost:4000/api/v1`.

### Frontend (GitHub Pages)

The frontend is static. The API base URL is configured via the global `ELEVATE_API_URL` variable (defaults to `/api/v1`). Push to `main` to trigger the GitHub Pages deploy workflow.

## Deployment

- **Backend** — `render.yaml` configures a free Render web service with a managed PostgreSQL database. Push to `main` to auto-deploy.
- **Frontend** — `.github/workflows/deploy-pages.yml` deploys the static site to GitHub Pages on every push to `main`.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `AI_API_KEY` | Google Gemini API key |
| `AI_MODEL` | Gemini model to use (default: `gemini-2.0-flash`) |

## License

MIT
