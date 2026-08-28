import { type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type WorkspaceTab = {
  value: string;
  label: string;
  content: ReactNode;
};

export function Workspace({
  title,
  subtitle,
  tabs,
  aside,
}: {
  title: string;
  subtitle?: string;
  tabs: WorkspaceTab[];
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {aside}
      </div>

      <Tabs defaultValue={tabs[0]?.value ?? ""} dir="rtl" className="space-y-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary/60 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
