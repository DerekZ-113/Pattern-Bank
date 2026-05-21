import type { ActiveTab } from "../types";

type NavIconName = "today" | "progress" | "problems";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

function NavIcon({ name }: { name: NavIconName }) {
  const lineProps = {
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  const filledProps = {
    fill: "currentColor",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const content = (() => {
    switch (name) {
      case "today":
        return (
          <>
            <rect x="4" y="5" width="16" height="15" rx="2" {...lineProps} />
            <line x1="8" y1="3" x2="8" y2="7" {...lineProps} />
            <line x1="16" y1="3" x2="16" y2="7" {...lineProps} />
            <circle cx="12" cy="14" r="2.5" {...lineProps} />
          </>
        );
      case "progress":
        return (
          <>
            <rect x="4" y="12" width="3" height="8" rx="1" {...lineProps} />
            <rect x="10.5" y="8" width="3" height="12" rx="1" {...lineProps} />
            <rect x="17" y="4" width="3" height="16" rx="1" {...lineProps} />
          </>
        );
      case "problems":
        return (
          <>
            <line x1="8" y1="6" x2="20" y2="6" {...lineProps} />
            <line x1="8" y1="12" x2="20" y2="12" {...lineProps} />
            <line x1="8" y1="18" x2="20" y2="18" {...lineProps} />
            <circle cx="4" cy="6" r="1" {...filledProps} />
            <circle cx="4" cy="12" r="1" {...filledProps} />
            <circle cx="4" cy="18" r="1" {...filledProps} />
          </>
        );
    }
  })();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[19px] w-[19px]"
      focusable="false"
    >
      {content}
    </svg>
  );
}

export default function NavBar({ activeTab, onTabChange }: Props) {
  const tabs: { id: ActiveTab; label: string; icon: NavIconName }[] = [
    { id: "dashboard", label: "Today", icon: "today" },
    { id: "progress", label: "Progress", icon: "progress" },
    { id: "problems", label: "Problems", icon: "problems" },
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
            <span aria-hidden="true" className="flex h-5 items-center justify-center leading-none">
              <NavIcon name={tab.icon} />
            </span>
            {tab.label}
          </button>
        );
      })}
      </div>
    </nav>
  );
}
