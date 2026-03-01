export default function NavBar({ activeTab, onTabChange, onAddClick }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "◫" },
    { id: "problems", label: "All Problems", icon: "☰" },
    { id: "roadmaps", label: "Roadmaps", icon: "◈" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] flex justify-center border-t border-pb-border bg-pb-surface">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex max-w-[160px] flex-1 flex-col items-center gap-0.5 border-none bg-transparent pb-3 pt-2.5 text-[11px] transition-colors duration-150 ${active
                ? "border-t-2 border-t-pb-accent font-semibold text-pb-accent"
                : "border-t-2 border-t-transparent font-medium text-pb-text-dim"
              } cursor-pointer`}
          >
            <span className="flex h-7 items-center justify-center text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
      <button
        onClick={onAddClick}
        className="flex max-w-[160px] flex-1 cursor-pointer flex-col items-center gap-0.5 border-none border-t-2 border-t-transparent bg-transparent pb-3 pt-2.5 text-[11px] font-semibold text-pb-accent"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pb-accent-subtle text-sm leading-none">
          +
        </span>
        Add Problem
      </button>
    </div>
  );
}
