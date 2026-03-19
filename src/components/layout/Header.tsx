interface HeaderProps {
  projectName?: string;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
}

export function Header({ projectName, onOpenDashboard, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-stroke/40 bg-bg-primary/60 backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between px-6">
        <button className="flex items-center gap-3 text-left group" onClick={onOpenDashboard}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-blue/70 text-sm font-bold text-white shadow-lg shadow-accent-blue/20 transition-transform group-hover:scale-105">
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
          className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
