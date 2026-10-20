export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Chargement">
      <span className="size-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  )
}
