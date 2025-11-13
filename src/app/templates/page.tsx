"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layouts/MainLayout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TemplateList, TemplateForm } from "@/components/recurring-transactions"
import { EmptyState } from "@/components/month-view"
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useToggleTemplateActive,
} from "@/hooks"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { TransactionTemplate, CreateTemplateData, UpdateTemplateData } from "@/lib/types/recurring-transactions"

export default function TemplatesPage() {
  // Fetch templates
  const { data: templatesData, isLoading } = useTemplates()
  const templates = templatesData?.templates || []

  // Mutations
  const { mutateAsync: createTemplate, isPending: isCreating } = useCreateTemplate()
  const { mutateAsync: updateTemplate, isPending: isUpdating } = useUpdateTemplate()
  const { mutateAsync: deleteTemplate, isPending: isDeleting } = useDeleteTemplate()
  const { mutateAsync: toggleActive } = useToggleTemplateActive()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedTemplate, setSelectedTemplate] = React.useState<TransactionTemplate | null>(null)

  // Handlers
  const handleCreate = () => {
    setSelectedTemplate(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      setSelectedTemplate(template)
      setIsEditModalOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      setSelectedTemplate(template)
      setIsDeleteDialogOpen(true)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await toggleActive({ id, isActive })
      toast.success(`Template ${isActive ? "activated" : "deactivated"}`)
    } catch (error) {
      toast.error("Failed to update template")
    }
  }

  const handleSubmitCreate = async (data: CreateTemplateData) => {
    try {
      await createTemplate(data)
      toast.success("Template created successfully")
      setIsCreateModalOpen(false)
    } catch (error) {
      toast.error("Failed to create template")
      throw error
    }
  }

  const handleSubmitEdit = async (data: UpdateTemplateData) => {
    if (!selectedTemplate) return

    try {
      await updateTemplate({ id: selectedTemplate.id, data })
      toast.success("Template updated successfully")
      setIsEditModalOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      toast.error("Failed to update template")
      throw error
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return

    try {
      await deleteTemplate(selectedTemplate.id)
      toast.success("Template deleted successfully")
      setIsDeleteDialogOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      toast.error("Failed to delete template")
    }
  }

  return (
    <MainLayout showSidebar={true} showMobileNav={false}>
      <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
        {/* Page Title */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
              Templates
            </h1>
            <Button onClick={handleCreate}>
              <Plus className="size-4 mr-2" />
              New Template
            </Button>
          </div>
          {/* Navigation Bar - Mobile/Tablet only */}
          <div className="lg:hidden">
            <div className="border-b border-border">
              <nav className="flex gap-4 overflow-x-auto scrollbar-hide">
                <a href="/home" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Home
                </a>
                <a href="/transactions" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  All Transactions
                </a>
                <a href="/month-view" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Month View
                </a>
                <a href="/templates" className="py-3 px-1 text-sm font-medium text-foreground border-b-2 border-foreground whitespace-nowrap">
                  Templates
                </a>
                <a href="/documents" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Documents
                </a>
                <a href="/reconciliation" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Reconciliation
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Template List */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-zinc-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            variant="no-templates"
            onAction={handleCreate}
            actionLabel="Create Your First Template"
          />
        ) : (
          <TemplateList
            templates={templates}
            onToggleActive={handleToggleActive}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={handleCreate}
            loading={isLoading}
          />
        )}

        {/* Create Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Create a new recurring transaction template
              </DialogDescription>
            </DialogHeader>
            <TemplateForm
              mode="create"
              onSubmit={handleSubmitCreate}
              onCancel={() => setIsCreateModalOpen(false)}
              saving={isCreating}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update template settings and recurrence pattern
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <TemplateForm
                mode="edit"
                initialData={selectedTemplate}
                onSubmit={handleSubmitEdit as (data: CreateTemplateData | UpdateTemplateData) => Promise<void>}
                onCancel={() => {
                  setIsEditModalOpen(false)
                  setSelectedTemplate(null)
                }}
                saving={isUpdating}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTemplate?.name}"?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedTemplate(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}
