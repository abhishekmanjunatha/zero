import Link from 'next/link'
import type { Metadata } from 'next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteDocumentTemplate, getDocumentTemplates } from '@/actions/templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Templates' }

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

export default async function TemplatesPage() {
  const templates = await getDocumentTemplates()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage custom document templates for quick reuse in the composer.
          </p>
        </div>
        <Link
          href="/patients"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Create New Note
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saved Custom Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates yet. Create a Custom Document and click Save as Template.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {templates.map((template) => (
                <div key={template.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDate(template.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/templates/${template.id}`}
                      className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        'use server'
                        await deleteDocumentTemplate(template.id)
                      }}
                    >
                      <Button type="submit" size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
