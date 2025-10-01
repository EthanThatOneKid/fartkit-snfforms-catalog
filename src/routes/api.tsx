import { Get, Router } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";

const catalogService = new KvCatalogService(kv);

export function ApiRoute() {
  return (
    <Router>
      <Get
        pattern="/api/catalog"
        handler={async (_ctx) => {
          try {
            const catalogItems = await catalogService.getItems();

            return new Response(
              JSON.stringify({
                success: true,
                data: catalogItems || [],
                count: catalogItems?.length || 0,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET",
                  "Access-Control-Allow-Headers": "Content-Type",
                },
              },
            );
          } catch (error) {
            console.error("Failed to fetch catalog:", error);

            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to fetch catalog",
                data: [],
                count: 0,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET",
                  "Access-Control-Allow-Headers": "Content-Type",
                },
                status: 500,
              },
            );
          }
        }}
      />
    </Router>
  );
}
