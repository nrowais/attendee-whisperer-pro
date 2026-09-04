import { createFileRoute } from "@tanstack/react-router";
import { Car, Ticket } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketsWorkspace } from "@/components/portal/TicketsWorkspace";
import { FleetWorkspace } from "@/components/portal/FleetWorkspace";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "النقل والتذاكر — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "إدارة تذاكر النقل والسائقين والمركبات وتوزيعها على رحلات الوصول والمغادرة في شاشة واحدة.",
      },
      { property: "og:title", content: "النقل والتذاكر — حوار الأمن والتاريخ" },
      {
        property: "og:description",
        content: "شاشة موحدة لتذاكر النقل وأسطول السائقين والمركبات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransportHubPage,
});

function TransportHubPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">النقل والتذاكر</h1>
        <p className="text-sm text-muted-foreground">
          شاشة واحدة لإصدار تذاكر النقل ومتابعتها، وإدارة السائقين والمركبات وتوزيعهم.
        </p>
      </header>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            تذاكر النقل
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2">
            <Car className="h-4 w-4" />
            السائقون والمركبات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <TicketsWorkspace />
        </TabsContent>
        <TabsContent value="fleet">
          <FleetWorkspace />
        </TabsContent>
      </Tabs>

      <p className="pt-2 text-center text-xs text-muted-foreground">نفذ بواسطة نايف الرويس</p>
    </div>
  );
}
