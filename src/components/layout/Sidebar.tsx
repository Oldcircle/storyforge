export interface SidebarItem {
  key: string;
  label: string;
  hash: string;
  disabled?: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  activeKey: string;
  onNavigate: (hash: string) => void;
}

export function Sidebar({ items, activeKey, onNavigate }: SidebarProps) {
  return (
    <aside className="w-full border-b border-stroke bg-bg-secondary/70 p-4 md:w-72 md:border-b-0 md:border-r">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        Workflow
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                isActive
                  ? "border border-accent-blue/40 bg-accent-blue/10 text-text-primary"
                  : "border border-transparent bg-bg-tertiary/50 text-text-secondary hover:border-stroke hover:text-text-primary"
              } ${item.disabled ? "cursor-not-allowed opacity-45" : ""}`}
              disabled={item.disabled}
              onClick={() => onNavigate(item.hash)}
            >
              <span className="text-sm font-medium">{item.label}</span>
              <span className="font-mono text-xs text-text-muted">{item.key}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
