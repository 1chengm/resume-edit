# Project Overview

This is a Next.js application called "ResumeCraft" that allows users to create, edit, and optimize their resumes with the help of AI. It uses Supabase for the backend, including database, authentication, and storage. The frontend is built with React and Tailwind CSS. The AI capabilities are powered by the Vercel AI SDK, supporting providers like OpenAI and DeepSeek.

## Key Features

-   **Authentication:** Users can sign up and log in using email/password or GitHub.
-   **Resume Editor:** A form-based editor with a live preview that supports Markdown rendering.
-   **AI-Powered Optimization:**
    -   **Resume Analysis:** Provides feedback and suggestions for improving the resume.
    -   **JD Match:** Compares the resume with a job description to identify key matching skills and keywords.
-   **PDF Export:** Generates a PDF version of the resume using HTML rendering to ensure compatibility.
-   **Sharing and Analytics:** Users can generate a shareable link for their resume and track view statistics.

## Technology Stack

-   **Frontend:** Next.js 16, React 19, Tailwind CSS v4
-   **UI Components:** shadcn/ui style components
-   **Backend:** Supabase (Postgres, Storage, Auth)
-   **AI:** Vercel AI SDK (OpenAI / DeepSeek)
-   **Testing:** Playwright for end-to-end testing and Vitest for unit testing.

# Building and Running

## Prerequisites

-   Node.js (>= 20.9.0)
-   A Supabase project

## Environment Variables

Create a `.env.local` file in the `web` directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
AI_PROVIDER=openai # or deepseek
OPENAI_API_KEY=<your-openai-api-key> # or DEEPSEEK_API_KEY
```

## Commands

-   **Install dependencies:** `npm install`
-   **Run the development server:** `npm run dev`
-   **Build the project:** `npm run build`
-   **Start the production server:** `npm run start`
-   **Run linters:** `npm run lint`
-   **Run end-to-end tests:** `npx playwright test`
-   **Run unit tests:** `npx vitest run`

# Development Conventions

-   **Directory Structure:**
    -   `app/`: Application routes and pages.
    -   `app/api/*`: API routes with Bearer token authentication.
    -   `src/lib/*`: Utility libraries for Supabase, AI, PDF generation, etc.
    -   `supabase/schema.sql`: Database schema and RLS policies.
    -   `tests/e2e/*`: End-to-end tests.
-   **API Authentication:** API routes are authenticated using a Bearer token.
-   **Database:** The database schema and RLS policies are managed in the `supabase/schema.sql` file.
-   **Testing:** The project includes both end-to-end tests with Playwright and unit tests with Vitest.
