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
    <aside className="w-full border-b border-stroke/40 bg-transparent p-4 md:w-64 md:border-b-0 md:border-r md:pt-6">
      <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-text-muted/70">
        Workflow
      </div>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition duration-300 ${
                isActive
                  ? "bg-accent-blue/10 text-accent-blue shadow-[inset_0_0_16px_rgba(99,102,241,0.08)] ring-1 ring-accent-blue/20"
                  : "text-text-secondary hover:bg-bg-tertiary/50 hover:text-text-primary"
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
