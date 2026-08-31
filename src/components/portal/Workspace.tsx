import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WorkspaceTab = {
  value: string;
  label: string;
  content: ReactNode;
};

export type WorkspaceGroup = {
  label: string;
  tabs: WorkspaceTab[];
};

export function Workspace({
  title,
  subtitle,
  tabs,
  groups,
  aside,
}: {
  title: string;
  subtitle?: string;
  tabs?: WorkspaceTab[];
  groups?: WorkspaceGroup[];
  aside?: ReactNode;
}) {
  const resolvedGroups = useMemo<WorkspaceGroup[]>(
    () => groups ?? [{ label: "", tabs: tabs ?? [] }],
    [groups, tabs],
  );

  const [groupIndex, setGroupIndex] = useState(0);
  const [active, setActive] = useState(resolvedGroups[0]?.tabs[0]?.value ?? "");

  const currentGroup = resolvedGroups[groupIndex] ?? resolvedGroups[0];
  const currentTabs = currentGroup?.tabs ?? [];
  const activeTab = currentTabs.find((t) => t.value === active) ?? currentTabs[0];
  const showGroups = resolvedGroups.length > 1;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {aside}
      </div>

      <div className="space-y-3">
        {showGroups ? (
          <div className="flex flex-wrap gap-2">
            {resolvedGroups.map((group, index) => (
              <button
                key={group.label}
                type="button"
                onClick={() => {
                  setGroupIndex(index);
                  setActive(group.tabs[0]?.value ?? "");
                }}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  index === groupIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/60 p-1">
          {currentTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActive(tab.value)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                tab.value === activeTab?.value
                  ? "bg-card font-semibold text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>{activeTab?.content}</div>
    </div>
  );
}
