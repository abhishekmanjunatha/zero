# Strive Application Workflows

This document describes the key user workflows and application processes in Strive.

## Authentication Workflow

```
User → Registration/Login
  ├── Email verification (if new user)
  ├── Password setup (if new user)
  ├── Forgot password flow (if needed)
  └── Redirected to Dashboard
```

### Account Recovery
- **Forgot Password**: User requests password reset link via email
- **Reset Password**: User follows link and sets new password
- **Email Verification**: New users verify email before account activation

## Patient Management Workflow

```
Dashboard → Patient Management
  ├── View patient list
  ├── Select patient
  ├── View patient profile
  │   ├── Medical history
  │   ├── Contact information
  │   └── Document access
  ├── Create appointment with patient
  └── Add clinical notes
```

## Appointment Management Workflow

```
Dashboard → Appointments
  ├── View all appointments (timeline view)
  ├── Create new appointment
  │   ├── Select patient
  │   ├── Choose date/time
  │   ├── Add notes/reason
  │   └── Schedule
  ├── View appointment details
  ├── Update appointment status
  └── Document outcomes
```

### Appointment Lifecycle
1. **Scheduled** - Initial creation
2. **Confirmed** - Patient confirmation
3. **In Progress** - During appointment
4. **Completed** - Post-appointment
5. **Cancelled** - If cancelled

## Clinical Notes Workflow

```
Patient Profile / Appointments → Clinical Notes
  ├── Select template OR start fresh
  ├── Open document composer
  │   ├── Add structured sections
  │   ├── Add free-form text
  │   ├── Format and organize
  │   └── Review for accuracy
  ├── Link to patient/appointment
  ├── Save as draft (auto-save)
  └── Finalize and store
```

### Document Storage
- Documents stored in Supabase Storage
- Associated with patient records
- Access controlled by user role
- Retention policies per document type

## Lab Reports Workflow

```
Patient → Lab Upload
  ├── Receive lab upload link (with token)
  ├── Select lab report file(s)
  ├── Upload to system
  └── System stores and notifies care team

OR

Care Team → Lab Upload Management
  ├── View pending uploads
  ├── Review uploaded reports
  ├── Process and categorize
  └── Associated with patient record
```

### Lab Upload Security
- Token-based access (single-use or expiring)
- Patient-specific upload links
- Automated file validation
- Secure storage with encryption

## Dashboard Workflow

```
Login → Dashboard
  ├── View today's appointments
  ├── See patient activity
  ├── Access quick actions
  │   ├── New appointment
  │   ├── Add clinical note
  │   ├── View lab reports
  │   └── Manage patients
  └── View notifications/alerts
```

## Onboarding Workflow

```
First-time User → Onboarding
  ├── Welcome screen
  ├── Practice setup
  │   ├── Upload practice logo
  │   ├── Configure settings
  │   └── Add team members (if applicable)
  ├── Feature tutorial
  ├── Initial data setup
  └── Redirect to Dashboard
```

## Notification System

- **Appointment reminders**: 24 hours and 1 hour before
- **Lab report uploads**: Notification when new report received
- **Clinical note sharing**: When notes are shared with patient
- **System alerts**: Important system or account messages

## Data Access & Permissions

### Patient-Facing
- View own appointments
- View own clinical notes
- Upload lab reports via secure link
- Update own profile information

### Care Team/Practitioner
- Full access to assigned patients' data
- Create and manage appointments
- Write and edit clinical notes
- Review lab reports
- Access audit logs

### Admin (if applicable)
- System-wide access
- User management
- Settings configuration
- Reports and analytics

## Common User Journeys

### New Patient First Appointment
1. Patient registers account
2. Completes onboarding
3. Care team creates appointment
4. Patient receives confirmation
5. Appointment day: patient checks in
6. Practitioner documents clinical notes
7. Lab orders may be generated
8. Follow-up scheduled if needed

### Lab Report Processing
1. Lab facility sends secure upload link
2. Patient receives link via email
3. Patient uploads report
4. Care team receives notification
5. Report reviewed and processed
6. Patient notified of results
7. Discussion notes added to record

### Clinical Note Documentation
1. During/after appointment, practitioner opens note composer
2. Selects relevant template or starts fresh
3. Documents observations, assessments, plan
4. Auto-saved periodically
5. Transcription or manual entry completed
6. Final review and approval
7. Stored with patient record
8. Accessible to authorized team members

---

**Last Updated**: April 1, 2026
