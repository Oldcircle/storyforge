interface HeaderProps {
  projectName?: string;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
}

export function Header({ projectName, onOpenDashboard, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke/90 bg-bg-primary/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <button className="flex items-center gap-3 text-left" onClick={onOpenDashboard}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stroke bg-bg-secondary text-sm font-bold text-accent-mint">
            SF
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-text-muted uppercase">
              StoryForge
            </div>
            <div className="text-base font-semibold text-text-primary">
              {projectName ?? "MVP Workspace"}
            </div>
          </div>
        </button>

        <button
          className="rounded-full border border-stroke bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:border-stroke-strong hover:text-text-primary"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
