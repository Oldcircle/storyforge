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
    <aside className="w-full shrink-0 border-b border-stroke p-4 md:w-56 md:border-b-0 md:border-r md:py-6 md:pr-5">
      <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Workspace
      </div>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "bg-accent-blue/12 font-medium text-accent-blue"
                  : "text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary"
              } ${item.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              disabled={item.disabled}
              onClick={() => onNavigate(item.hash)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
