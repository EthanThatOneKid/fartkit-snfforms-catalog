import { Get, Router } from "@fartlabs/rtx";
import { DIV, H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";
import { Catalog, CatalogScript } from "#/components/catalog.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { findCatalogItem } from "#/lib/snfforms.ts";
import { searchCatalog } from "#/lib/orama.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { searchQuerySchema, validateFormData } from "#/lib/validation.ts";

const catalogService = new KvCatalogService(kv);

export function IndexPageRoute() {
  return (
    <Router>
      <Get
        pattern="/"
        handler={async (ctx) => {
          const url = new URL(ctx.request.url);
          const rawSearch = url.searchParams.get("search");

          // Validate search query
          const searchValidation = validateFormData(
            searchQuerySchema,
            rawSearch,
          );
          const search = searchValidation.success
            ? searchValidation.data
            : null;

          // Lazy seed: only seed if the KV store is empty
          let catalogItems = (await catalogService.getItems()) ?? [];
          if (catalogItems.length === 0) {
            try {
              await catalogService.seed();
              catalogItems = (await catalogService.getItems()) ?? [];
            } catch (error) {
              console.error("Failed to seed catalog:", error);
              // Continue with empty catalog rather than failing the request
            }
          }
          const orama = await catalogService.getOramaIndex();
          const items = search && orama
            ? (await searchCatalog(orama, search)).hits.map((result) => {
              const item = findCatalogItem(
                catalogItems,
                result.document.formId,
              );
              if (!item) {
                // If we can't find a catalog item from search results,
                // this indicates a data inconsistency, but we'll handle it gracefully
                console.warn(
                  `Catalog item not found in search results: ${result.document.formId}`,
                );
                return null;
              }

              return item;
            }).filter((item): item is CatalogItem => item !== null)
            : catalogItems;

          return new Response(
            <IndexPage search={search ?? null} items={items} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <RedirectRoute pattern="(/)*" redirectUrl="/" />
    </Router>
  );
}

interface IndexPageProps {
  search: string | null;
  items: CatalogItem[];
}

export function IndexPage(props: IndexPageProps) {
  return (
    <Layout
      head={<CatalogScript />}
      title="SNF Forms"
      description="SNF Forms has been facilitating the health care industry for over 20 years. We provide the easiest access to a variety of medical forms and supplies."
    >
      <DIV class="hero">
        <H1>SNF Forms</H1>
        <P>
          SNF Forms has been facilitating the health care industry for over 20
          years. We provide the easiest access to a variety of medical forms and
          supplies. Our role is to efficiently provide product on call so that
          our valued clients can do their jobs without delay. We thank you for
          the opportunity to serve your needs.
        </P>
      </DIV>

      <Catalog search={props.search} items={props.items} />
    </Layout>
  );
}
