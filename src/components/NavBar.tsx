import type { ActiveTab } from "../types";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function NavBar({ activeTab, onTabChange }: Props) {
  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Today", icon: "◷" },
    { id: "progress", label: "Progress", icon: "▣" },
    { id: "problems", label: "All Problems", icon: "☰" },
  ];

  return (
    <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 z-[900] border-t border-pb-border bg-pb-bg/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-3">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 border-none bg-transparent text-[11px] transition-colors duration-150 ${
              active
                ? "font-semibold text-pb-accent"
                : "font-medium text-pb-text-dim hover:text-pb-text-muted"
            } cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-pb-accent`}
          >
            <span aria-hidden="true" className="flex h-5 items-center justify-center text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
      </div>
    </nav>
  );
}
