/**
 * Spinner di caricamento riutilizzabile.
 * Sostituisce i vari `animate-pulse text-muted-foreground` sparsi nel codice.
 */
export function LoadingSpinner({ fullScreen = true }: { fullScreen?: boolean }) {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-accent" />
    </div>
  );
}
