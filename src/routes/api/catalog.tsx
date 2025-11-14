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
    </Router>
  );
}
