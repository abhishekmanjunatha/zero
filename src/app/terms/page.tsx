import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms of Service - Strive' }

const sections = [
  {
    title: '1. Eligibility',
    body: 'You must be an authorized healthcare professional or approved staff member to use Strive. You are responsible for all actions performed under your account.',
  },
  {
    title: '2. Clinical Data Use',
    body: 'You agree to use the platform only for legitimate care delivery and related operational workflows. You must not upload unlawful content or misuse patient data.',
  },
  {
    title: '3. Account Security',
    body: 'You are responsible for maintaining credential confidentiality, enabling secure access practices, and notifying us immediately if you suspect unauthorized use.',
  },
  {
    title: '4. Availability',
    body: 'We work to maintain reliable access but do not guarantee uninterrupted service. Planned maintenance and occasional downtime may occur.',
  },
  {
    title: '5. Limitation of Liability',
    body: 'Strive is provided on an as-is basis to the extent allowed by law. You remain responsible for clinical judgment, documentation accuracy, and final treatment decisions.',
  },
  {
    title: '6. Updates',
    body: 'We may update these terms to reflect legal or product changes. Continued use of the platform after an update indicates acceptance of the revised terms.',
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-surface px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-outline-variant bg-white p-8 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Legal</p>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Terms of Service</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Effective date: April 2026</p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-base font-semibold text-on-surface">{section.title}</h2>
              <p className="text-sm leading-relaxed text-on-surface-variant">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-outline-variant pt-5">
          <p className="text-sm text-outline">
            Questions about these terms can be sent to support through your clinic admin channel.
          </p>
          <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline hover:underline-offset-2">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
