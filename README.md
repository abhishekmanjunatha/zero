This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

Create or update `.env.local` with at least the following:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` is required for secure patient upload links (`/lab-upload/[token]`) because token validation and storage writes run in server-only API routes.

### Optional: Server-side PDF optimization tools

The secure upload API now attempts server-side PDF optimization for scanned PDFs before storing them.

- Preferred: Ghostscript (`gs`, `gswin64c`, or `gswin32c`)
- Fallback: qpdf (`qpdf`)

If neither binary is installed, uploads still work and files are stored without server-side PDF optimization.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Mobile Contacts Picker (Capacitor)

Phone number fields now support native contact selection when the app runs inside Capacitor (Android/iOS).

1. Install dependencies:

```bash
npm install
```

2. Sync Capacitor plugins:

```bash
npx cap sync
```

3. iOS permission: add this key to `ios/App/App/Info.plist` if not present:

```xml
<key>NSContactsUsageDescription</key>
<string>Peepal needs access to contacts so you can quickly fill phone numbers.</string>
```

4. Android permission: ensure `android.permission.READ_CONTACTS` is present in `android/app/src/main/AndroidManifest.xml`.

The contact picker button is hidden on web and appears only in native mobile builds.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
