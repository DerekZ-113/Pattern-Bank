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

// One nav, two homes. On small screens it is the fixed bottom tab bar; from
// `md` up it drops into the header row (Header renders it as a child) as
// plain text tabs. It is a single element either way, so there is exactly one
// "Today" button in the accessibility tree at every width.
export default function NavBar({ activeTab, onTabChange }: Props) {
  const tabs: { id: ActiveTab; label: string; icon: NavIconName }[] = [
    { id: "dashboard", label: "Today", icon: "today" },
    { id: "progress", label: "Progress", icon: "progress" },
    { id: "problems", label: "Problems", icon: "problems" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-pb-border-light bg-pb-bg/90 backdrop-blur md:static md:z-auto md:self-stretch md:border-t-0 md:bg-transparent md:backdrop-blur-none"
    >
      <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-3 md:flex md:h-full md:max-w-none md:gap-1">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-1 border-none bg-transparent text-xs transition-colors duration-150 focus-visible:outline-offset-[-3px] md:px-3 md:text-sm ${
                active
                  ? "font-semibold text-pb-accent md:text-pb-text"
                  : "font-medium text-pb-text-dim hover:text-pb-text-muted md:text-pb-text-muted md:hover:text-pb-text"
              }`}
            >
              <span aria-hidden="true" className="flex h-5 items-center justify-center leading-none md:hidden">
                <NavIcon name={tab.icon} />
              </span>
              {tab.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-px hidden h-0.5 rounded-full bg-pb-accent md:block"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
