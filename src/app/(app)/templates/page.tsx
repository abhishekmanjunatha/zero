import type { Metadata } from 'next'
import { CalendarPlus, ClipboardList, FileText, Pencil, UserPlus, Users, Trash2 } from 'lucide-react'
import { deleteDocumentTemplate, getDocumentTemplates } from '@/actions/templates'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'

export const metadata: Metadata = { title: 'Templates' }

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export default async function TemplatesPage() {
  const templates = await getDocumentTemplates()

  return (
    <div className="app-page">
      <section className="rounded-2xl border border-border/40 bg-card/95 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <LinkButton href="/clinical-notes/new" className="h-10 gap-1.5 rounded-xl">
              <ClipboardList className="h-4 w-4" />
              Create New Note
            </LinkButton>
            <LinkButton href="/appointments/new" variant="outline" className="h-10 gap-1.5 rounded-xl">
              <CalendarPlus className="h-4 w-4" />
              New Appointment
            </LinkButton>
            <LinkButton href="/patients/new" variant="outline" className="h-10 gap-1.5 rounded-xl">
              <UserPlus className="h-4 w-4" />
              Add Patient
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card/95 p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold tracking-tight">Template Library</p>
            <p className="text-xs text-muted-foreground">Edit, clean up, and reuse your clinical writing system.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {templates.length}
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/20 px-4 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground">
              Create a Custom Document from a patient flow, then save it as a template.
            </p>
            <LinkButton href="/patients" variant="outline" size="sm" className="mt-1 gap-1.5 rounded-xl">
              <Users className="h-4 w-4" />
              Go to Patients
            </LinkButton>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/75 p-3 transition-colors hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">{template.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(template.updated_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <LinkButton
                    href={`/templates/${template.id}`}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-xl"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </LinkButton>
                  <form
                    action={async () => {
                      'use server'
                      await deleteDocumentTemplate(template.id)
                    }}
                  >
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-xl text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
