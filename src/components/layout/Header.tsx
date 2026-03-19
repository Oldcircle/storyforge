interface HeaderProps {
  projectName?: string;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
}

export function Header({ projectName, onOpenDashboard, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <button className="group flex items-center gap-3 text-left" onClick={onOpenDashboard}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-indigo text-xs font-bold text-white shadow-glow">
            SF
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text-primary">StoryForge</span>
            {projectName && (
              <>
                <span className="text-text-muted">/</span>
                <span className="text-sm text-text-secondary">{projectName}</span>
              </>
            )}
          </div>
        </button>
        <button
          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-stroke-strong hover:text-text-primary"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
