import { Get, Router } from "@fartlabs/rtx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";
import { Catalog, CatalogScript } from "#/components/catalog.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { findCatalogItem } from "#/lib/snfforms.ts";
import { searchCatalog } from "#/lib/orama.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { searchQuerySchema } from "#/lib/validation.ts";

const catalogService = new KvCatalogService(kv);

export function CatalogPageRoute() {
  return (
    <Router>
      <Get
        pattern="/catalog"
        handler={async (ctx) => {
          const url = new URL(ctx.request.url);
          const rawSearch = url.searchParams.get("search");

          // Validate the search query parameter.
          const searchValidation = searchQuerySchema.safeParse(rawSearch);
          const search = searchValidation.success
            ? searchValidation.data
            : null;

          // Lazy seed: only seed if the KV store is empty.
          let catalogItems = (await catalogService.getItems()) ?? [];
          if (catalogItems.length === 0) {
            try {
              await catalogService.seed();
              catalogItems = (await catalogService.getItems()) ?? [];
            } catch (error) {
              console.error("Failed to seed catalog:", error);
              // Continue with empty catalog rather than failing the request.
            }
          }
          const orama = await catalogService.getOramaIndex();
          const items = search && orama
            ? (await searchCatalog(orama, search)).hits
              .map((result) => {
                const item = findCatalogItem(
                  catalogItems,
                  result.document.formId,
                );
                if (!item) {
                  // If we can't find a catalog item from search results,
                  // this indicates a data inconsistency, but we'll handle it gracefully.
                  console.warn(
                    `Catalog item not found in search results: ${result.document.formId}`,
                  );
                  return null;
                }

                return item;
              })
              .filter((item): item is CatalogItem => item !== null)
            : catalogItems;

          return new Response(
            <CatalogPage search={search ?? null} items={items} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <RedirectRoute pattern="(/)*" redirectUrl="/catalog" />
    </Router>
  );
}

interface CatalogPageProps {
  search: string | null;
  items: CatalogItem[];
}

export function CatalogPage(props: CatalogPageProps) {
  return (
    <Layout
      head={<CatalogScript />}
      title="Form Catalog - SNF Forms"
      description="Search and browse our comprehensive catalog of medical forms and supplies."
    >
      <Catalog search={props.search} items={props.items} />
    </Layout>
  );
}
