import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy Policy - Strive' }

const sections = [
  {
    title: '1. Information We Process',
    body: 'We process account details, operational activity, and clinical workflow data required to deliver the Strive platform. Sensitive records are handled under applicable healthcare privacy obligations.',
  },
  {
    title: '2. How Data Is Used',
    body: 'Data is used to authenticate access, support scheduling and documentation features, improve reliability, and provide customer support for authorized users.',
  },
  {
    title: '3. Data Sharing',
    body: 'We do not sell personal information. Data may be shared with trusted infrastructure providers strictly to operate the service and only under contractual safeguards.',
  },
  {
    title: '4. Retention and Security',
    body: 'We retain information according to contractual and legal requirements. Security controls include encrypted transport, access control, and audit-oriented logging.',
  },
  {
    title: '5. Your Responsibilities',
    body: 'You are responsible for obtaining required patient permissions, using secure devices, and restricting account access to authorized staff only.',
  },
  {
    title: '6. Policy Changes',
    body: 'We may update this policy as legal requirements or platform capabilities evolve. Continued use after publication means you accept the updated policy.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-surface px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-outline-variant bg-white p-8 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-outline">Legal</p>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Privacy Policy</h1>
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
            If you have privacy questions, contact your clinic administrator or support channel.
          </p>
          <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline hover:underline-offset-2">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  )
}
