import { MaterialSymbol } from '@/components/ui/material-symbol'

// Auth route group layout — two-column on desktop, full-height centered on mobile/tablet
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-surface">
      <div className="relative grid min-h-dvh w-full lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-tertiary p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'url(https://lh3.googleusercontent.com/aida-public/AB6AXuCEFo0XoKgz5qv5t86CfTvUiSEVyZ3reea82jdbj6_hdsGeyJr90fqcbVRLNq4mp-yYAmGZrBKHLwuWUpufhp8FQsb5gpYY45uuDduSipBYZO9JkXBdIjKO3tbGbUujAdwbPRF_i4So79MNWflGdH5qkRDcX5OfZCzKhfvZmfsk7gGz9SaqFcKimn0rryfKMG7w3wFpFexIO5k89TDXf6kS9WNv_FQQhzdZe5S1dqPTYyz9CRFfBIycgpRFJnerSgUuP0p37X391Q)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <div className="space-y-4">
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary-fixed text-tertiary">
                <MaterialSymbol name="clinical_notes" className="text-xl" />
              </div>
              <p className="text-2xl font-extrabold uppercase tracking-tight text-tertiary-fixed">Clinical Precision</p>
            </div>

            <div className="relative z-10 max-w-xl pt-8">
              <span className="inline-block rounded-full border border-tertiary-fixed/20 bg-tertiary-container/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-tertiary-fixed">STRIVE PLATFORM</span>
              <h2 className="mt-6 text-5xl font-extrabold leading-[1.1] tracking-tight">Built for nutritionists who move fast.</h2>
              <p className="mt-6 max-w-md text-xl font-medium leading-relaxed text-tertiary-fixed">
              Manage appointments, patients, and care plans in one calm workspace.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 text-sm">
            <p className="inline-flex w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
              <MaterialSymbol name="check_circle" filled className="text-base text-tertiary-fixed" />
              Unified intake, sessions, and follow-ups.
            </p>
            <p className="inline-flex w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
              <MaterialSymbol name="check_circle" filled className="text-base text-tertiary-fixed" />
              Frictionless onboarding for every new practitioner.
            </p>
            <p className="inline-flex w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
              <MaterialSymbol name="check_circle" filled className="text-base text-tertiary-fixed" />
              A focused interface that respects your time.
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-white/70">
              <span>Trusted by leading clinics</span>
              <span className="h-px w-24 bg-white/20" />
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-dvh flex-col items-center justify-start px-0 pb-0 pt-0 lg:justify-center lg:px-12 lg:py-14">
          <div className="w-full max-w-sm sm:max-w-md">{children}</div>
        </section>
      </div>
    </main>
  )
}
