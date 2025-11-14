import { Get, Router } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { corsErrorResponse, corsSuccessResponse } from "#/lib/responses.ts";

const catalogService = new KvCatalogService(kv);

export function CatalogApiRoute() {
  return (
    <Router>
      <Get
        pattern="/api/catalog"
        handler={async (_ctx) => {
          try {
            const catalogItems = await catalogService.getItems();

            return corsSuccessResponse(
              catalogItems || [],
              catalogItems?.length || 0,
            );
          } catch (error) {
            console.error("Failed to fetch catalog:", error);
            return corsErrorResponse("Failed to fetch catalog", 500);
          }
        }}
      />
      <Get
        pattern="/api/catalog.json"
        handler={async (_ctx) => {
          try {
            const catalogItems = await catalogService.getItems();

            const json = JSON.stringify(catalogItems || [], null, 2);

            return new Response(json, {
              headers: {
                "Content-Type": "application/json",
                "Content-Disposition": 'attachment; filename="catalog.json"',
              },
            });
          } catch (error) {
            console.error("Failed to generate catalog JSON:", error);
            return new Response(
              JSON.stringify({ error: "Failed to generate catalog JSON" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        }}
      />
    </Router>
  );
}
