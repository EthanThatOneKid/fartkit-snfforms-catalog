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

          const catalogItems = (await catalogService.getItems()) ?? [];
          const orama = await catalogService.getOramaIndex();
          const items = search && search.length > 0 && orama
            ? (await searchCatalog(orama, search)).hits
              .map((result) => {
                const doc = result.document as { formId: string };
                const item = findCatalogItem(
                  catalogItems,
                  doc.formId,
                );
                if (!item) {
                  // If we can't find a catalog item from search results,
                  // this indicates a data inconsistency, but we'll handle it gracefully.
                  console.warn(
                    `Catalog item not found in search results: ${doc.formId}`,
                  );
                  return null;
                }

                return item;
              })
              .filter((item): item is CatalogItem => item !== null)
            : [];

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
