# Strive Application Overview

## Project Summary

Strive is a Next.js based healthcare application built with TypeScript and Supabase. The application provides appointment management, clinical notes, lab reports, patient profiles, and onboarding workflows.

## Core Architecture

### Frontend Framework
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules with PostCSS
- **Component Library**: Shadcn UI components

### Backend Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage (documents, uploads)
- **API Routes**: Next.js API Routes

### Build & Deployment
- **Bundler**: Next.js with TypeScript
- **Linting**: ESLint (flat config)
- **Desktop**: Capacitor for desktop support

## Application Structure

### Directory Layout

```
src/
├── app/                    # Next.js app directory
│   ├── (app)/             # Main application routes (protected)
│   │   ├── appointments/  # Appointment management
│   │   ├── clinical-notes/ # Clinical note composer
│   │   ├── dashboard/     # Main dashboard
│   │   ├── lab-reports/   # Lab report uploads & viewing
│   │   ├── patients/      # Patient management
│   │   ├── profile/       # User profile
│   │   └── templates/     # Document templates
│   ├── (auth)/            # Authentication routes
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   ├── (onboarding)/      # Onboarding flow
│   ├── api/               # Backend API routes
│   │   ├── ai/           # AI-related endpoints
│   │   ├── auth/         # Authentication endpoints
│   │   └── upload/       # File upload endpoints
│   ├── lab-upload/        # Lab upload with token validation
│   ├── privacy/           # Privacy policy page
│   ├── terms/             # Terms of service page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── appointments/      # Appointment UI components
│   ├── clinical-notes/    # Note composer components
│   ├── dashboard/         # Dashboard components
│   ├── lab-reports/       # Lab report components
│   ├── layout/            # Layout components
│   ├── onboarding/        # Onboarding components
│   ├── patients/          # Patient UI components
│   ├── profile/           # Profile components
│   ├── shared/            # Shared components
│   └── ui/                # Base UI components
├── lib/                   # Utility libraries
│   ├── pdf-generator.ts   # PDF generation
│   ├── rate-limit.ts      # Rate limiting
│   ├── utils.ts           # General utilities
│   ├── ai/                # AI utility functions
│   ├── constants/         # App constants
│   ├── notifications/     # Notification utilities
│   ├── pdf/               # PDF utilities
│   ├── supabase/          # Supabase client setup
│   ├── utils/             # Additional utilities
│   └── validations/       # Input validation schemas
├── hooks/                 # React hooks
│   ├── use-debounce.ts
│   ├── use-device-contact-picker.ts
│   ├── use-is-mobile.ts
│   └── use-local-draft.ts
├── actions/               # Server actions
│   ├── ai.ts
│   ├── appointments.ts
│   ├── auth.ts
│   ├── clinical-notes.ts
│   ├── dashboard.ts
│   ├── dietitian.ts
│   ├── lab-reports.ts
│   ├── onboarding.ts
│   ├── patients.ts
│   └── templates.ts
└── types/                 # TypeScript type definitions
    ├── ai.ts
    ├── app.ts
    ├── database.ts
    └── notifications.ts
```

## Key Features

### 1. Authentication
- User registration and login
- Email verification
- Password reset flow
- Role-based access control

### 2. Appointment Management
- Create and schedule appointments
- View appointment timeline
- Manage appointment lifecycle

### 3. Clinical Notes
- Document composer for clinical notes
- Template-based note creation
- Document storage and retrieval

### 4. Lab Reports
- Upload lab reports with file storage
- Lab-specific routes with token validation
- Report viewing and management

### 5. Patient Management
- Patient profile management
- Patient list view
- Patient data lookup

### 6. Dashboard
- Overview of key metrics
- Quick access to main features
- User activity tracking

### 7. Onboarding
- New user onboarding workflow
- Setup and configuration flow

## Database Schema

Located in `supabase/migrations/`:
- `00001_initial_schema.sql` - Initial database structure
- `00002_document_templates.sql` - Template management
- `00003_appointment_lifecycle_and_timeline.sql` - Appointment tracking
- `00004_add_practice_logo.sql` - Practice branding
- `00005_ensure_documents_storage_policies.sql` - Document access policies
- `00006_increase_documents_bucket_limit.sql` - Storage optimization
- `00007_notifications.sql` - Notification system

## Key Technologies

- **Frontend**: React 18+, TypeScript, Next.js 14+
- **Styling**: Tailwind CSS, PostCSS
- **UI Components**: Shadcn UI
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT (Supabase Auth)
- **Storage**: S3-compatible (Supabase Storage)
- **AI Integration**: AI endpoints for clinical support
- **Desktop**: Capacitor for web-to-desktop conversion

## Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `capacitor.config.ts` - Capacitor desktop configuration
- `eslint.config.mjs` - ESLint rules
- `postcss.config.mjs` - PostCSS configuration
- `components.json` - UI component configuration

---

**Last Updated**: April 1, 2026
