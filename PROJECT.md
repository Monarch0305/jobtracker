# JobTracker

A full-stack job application tracker with Kanban board, detail modals, analytics dashboard, and PDF export. Built with Next.js 14 (App Router), deployed on Vercel.

---

## Tech Stack

| Layer         | Tool              | Purpose                        |
|---------------|-------------------|--------------------------------|
| Framework     | Next.js 14        | App Router, API routes, SSR    |
| Language      | TypeScript        | End-to-end type safety         |
| ORM           | Prisma            | Database access + migrations   |
| Database      | Neon PostgreSQL   | Free serverless Postgres       |
| Cache         | Upstash Redis     | Dashboard stats caching        |
| Auth          | NextAuth.js v5    | Credentials login, JWT session |
| File Storage  | Cloudflare R2     | Resume PDF uploads             |
| Styling       | Tailwind CSS      | Utility-first, dark theme only |
| Charts        | Recharts          | Analytics visualizations       |
| Drag & Drop   | @hello-pangea/dnd | Kanban card dragging           |
| PDF Export    | jsPDF + jspdf-autotable | Application report export |
| Validation    | Zod               | Input validation               |
| Deployment    | Vercel            | Free hosting, auto-deploy      |

---

## Theme

Dark theme only. All UI components use a dark color palette. No light mode toggle needed.

---

## Folder Structure

```
jobtracker/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, dark theme, font imports
│   │   ├── page.tsx                    # Redirect to /dashboard
│   │   ├── globals.css                 # Tailwind base + dark theme vars
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Kanban board view
│   │   │   └── analytics/page.tsx      # Analytics page
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── applications/
│   │       │   ├── route.ts            # GET (list all), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts        # GET, PUT, DELETE single
│   │       ├── analytics/route.ts      # GET dashboard stats
│   │       ├── upload/route.ts         # POST resume upload
│   │       ├── reminders/route.ts      # GET, POST reminders
│   │       └── export/pdf/route.ts     # GET download PDF report
│   ├── components/
│   │   ├── ui/                         # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx         # Full board with all columns
│   │   │   ├── KanbanColumn.tsx        # Single column (status)
│   │   │   ├── KanbanCard.tsx          # Single application card
│   │   │   └── ApplicationModal.tsx    # Click-to-open detail modal
│   │   ├── forms/
│   │   │   ├── ApplicationForm.tsx     # Add/edit application form
│   │   │   └── ReminderForm.tsx        # Set reminder form
│   │   └── analytics/
│   │       ├── StatsCards.tsx           # Top-level metric cards
│   │       ├── FunnelChart.tsx          # Conversion funnel
│   │       ├── TimelineChart.tsx        # Applications over time
│   │       └── StatusBreakdown.tsx     # Status count grid
│   ├── lib/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── redis.ts                    # Upstash Redis client
│   │   ├── upload.ts                   # R2 upload helpers
│   │   ├── pdf.ts                      # PDF report generation
│   │   └── validations.ts             # Zod schemas
│   ├── hooks/
│   │   ├── useApplications.ts          # Fetch + mutate applications
│   │   └── useAnalytics.ts             # Fetch analytics data
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── .env.local                          # Environment variables (never commit)
├── .env.example                        # Template for env vars
├── PROJECT.md                          # This file
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String
  passwordHash  String
  applications  Application[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Application {
  id           String      @id @default(cuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  company      String
  role         String
  url          String?
  salaryMin    Int?
  salaryMax    Int?
  status       Status      @default(APPLIED)
  priority     Priority    @default(MEDIUM)
  notes        String?
  resumeUrl    String?
  contactName  String?
  contactEmail String?
  appliedAt    DateTime    @default(now())
  interviewAt  DateTime?
  reminders    Reminder[]
  activities   Activity[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([userId, status])
  @@index([userId, appliedAt])
}

model Reminder {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  remindAt      DateTime
  message       String
  sent          Boolean     @default(false)
  createdAt     DateTime    @default(now())
}

model Activity {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  action        String
  createdAt     DateTime    @default(now())
}

enum Status {
  REJECTED
  WISHLIST
  APPLIED
  SCREENING
  INTERVIEW
  OFFER
  ACCEPTED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

---

## Column Order (Kanban Board)

Left to right:

1. **Rejected** — Dead applications, out of pipeline
2. **Wishlist** — Saved jobs, not yet applied
3. **Applied** — Application submitted
4. **Screening** — Recruiter call / initial screen
5. **Interview** — Technical / onsite rounds
6. **Offer** — Received an offer
7. **Accepted** — Offer accepted, done

Cards are draggable between any columns. Dragging a card triggers a PUT request to update the application status and creates an Activity log entry.

---

## API Endpoints

### Auth
| Method | Route                        | Description              |
|--------|------------------------------|--------------------------|
| POST   | /api/auth/[...nextauth]      | NextAuth login/logout    |

### Applications
| Method | Route                        | Description                                                |
|--------|------------------------------|------------------------------------------------------------|
| GET    | /api/applications            | List all for logged-in user. Query: ?status=&search=&sort= |
| POST   | /api/applications            | Create new application                                     |
| GET    | /api/applications/[id]       | Get single with reminders and activities                   |
| PUT    | /api/applications/[id]       | Update fields or status change                             |
| DELETE | /api/applications/[id]       | Delete application and related data                        |

### Analytics
| Method | Route              | Description                                              |
|--------|--------------------|----------------------------------------------------------|
| GET    | /api/analytics     | Count per status, funnel %, weekly counts, response rate |

### Upload
| Method | Route           | Description                    |
|--------|-----------------|--------------------------------|
| POST   | /api/upload     | Upload resume PDF to R2        |

### Reminders
| Method | Route              | Description                    |
|--------|--------------------|--------------------------------|
| POST   | /api/reminders     | Create reminder                |
| GET    | /api/reminders     | Get upcoming reminders         |

### Export
| Method | Route              | Description                    |
|--------|--------------------|--------------------------------------------|
| GET    | /api/export/pdf    | Download PDF report of all applications    |

---

## Pages and UI

### Login Page (/login)
- Email and password fields
- "Log in" button
- Link to register page
- Dark themed, centered card layout

### Register Page (/register)
- Name, email, password fields
- "Create account" button
- Link to login page

### Dashboard / Kanban Board (/dashboard)
- **Top bar**: App name "JobTracker", nav (Board | Analytics), user menu (logout), "Export PDF" button, "Add Application" button
- **Mini stats row**: 4 metric cards (Total, Active, Interviews, Offers)
- **Kanban board**: 7 columns — Rejected, Wishlist, Applied, Screening, Interview, Offer, Accepted
- **Each column**: Status name header with count badge, vertically stacked cards
- **Each card shows**: Company name (bold), role, applied date, priority badge if high
- **Click any card**: Opens ApplicationModal overlay with full details
- **Drag any card**: Moves to new status column, fires PUT API call, logs Activity

### Application Modal (overlay on dashboard)
- Company name and role as header, close button
- Status dropdown (change status inline)
- Priority badge
- Detail grid: salary range, applied date, contact name, contact email, job URL, interview date
- Reminder alert if set
- Notes text area (editable)
- Resume attachment with upload/replace option
- Activity timeline (auto-logged status changes)
- Footer: Edit, Set Reminder, Delete buttons

### Add/Edit Application Form (modal overlay)
- Fields: Company, Role, Job URL, Salary min, Salary max, Status dropdown, Priority dropdown, Contact name, Contact email, Notes, Interview date, Resume upload
- Save and Cancel buttons

### Analytics Page (/dashboard/analytics)
- Same top bar, Analytics tab active
- **Metric cards**: Total applied, Response rate %, Interviews, Offers
- **Conversion funnel**: Horizontal bars — Applied → Screening → Interview → Offer → Accepted with counts and percentages
- **Applications over time**: Line chart, weekly counts, past 8-12 weeks
- **Status breakdown**: Grid of cards with colored dots, status name, and count

---

## Environment Variables

```env
# Database (Neon)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Auth (NextAuth)
NEXTAUTH_SECRET="random-secret-string"
NEXTAUTH_URL="http://localhost:3000"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="jobtracker-resumes"
R2_PUBLIC_URL="https://your-bucket.r2.dev"
```

---

## Build Order

### Week 1: Foundation
1. Initialize Next.js 14 + TypeScript + Tailwind (dark theme)
2. Set up Prisma + Neon PostgreSQL connection
3. Create database schema and run migration
4. Set up NextAuth with credentials provider
5. Build login and register pages
6. Create protected route middleware

### Week 2: Core API + Kanban
1. Build CRUD API routes for applications (with Zod validation)
2. Build KanbanBoard, KanbanColumn, KanbanCard components
3. Integrate @hello-pangea/dnd for drag-and-drop
4. Wire drag events to PUT API for status updates
5. Build ApplicationModal with full detail view
6. Build Add Application form

### Week 3: Features
1. Activity logging on status change
2. Resume upload to Cloudflare R2
3. Reminders — create and display
4. Search and filter applications
5. Mini stats row on dashboard

### Week 4: Analytics + Export
1. Build /api/analytics endpoint with funnel calculations
2. Integrate Upstash Redis for caching analytics
3. Build analytics page with Recharts
4. Build PDF export with jsPDF
5. Polish UI, loading states, error handling, toasts

### Week 5: Deploy
1. Push to GitHub
2. Connect to Vercel, configure env vars
3. Test production build
4. Write README with screenshots and setup instructions

---

## Key Technical Decisions

- **Single repo, single deploy**: One Next.js app on Vercel. API routes handle backend. No separate server.
- **Dark theme only**: All Tailwind config uses dark palette. No toggle.
- **Drag-and-drop**: @hello-pangea/dnd (maintained fork of react-beautiful-dnd).
- **Activity log**: Every status change auto-creates an Activity record. Powers the modal timeline.
- **Redis caching**: Analytics cached in Upstash with 5-min TTL. Invalidated on application create/update/delete.
- **PDF export**: Server-side jsPDF. Returns downloadable file with application table sorted by date.
- **Column order**: Rejected first (leftmost). Keeps failed apps out of active pipeline visually.
