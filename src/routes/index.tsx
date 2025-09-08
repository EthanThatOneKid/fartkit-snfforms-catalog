import { Get, Router } from "@fartlabs/rtx";
import { DIV, H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";
import { Catalog, CatalogScript } from "#/components/catalog.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { searchCatalog } from "#/lib/orama.ts";
import { catalogItems, findCatalogItem } from "#/lib/catalog.ts";

export function IndexPageRoute() {
  return (
    <Router>
      <Get
        pattern="/"
        handler={async (ctx) => {
          const url = new URL(ctx.request.url);
          const search = url.searchParams.get("search");
          const items = search
            ? (await searchCatalog(search)).hits.map((result) => {
              const item = findCatalogItem(result.document.formId);
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
            <IndexPage search={search} items={items} />,
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
      title="SNF Printing"
      description="SNF Printing has been facilitating the health care industry for over 20 years. We provide the easiest access to a variety of medical forms and supplies."
    >
      <DIV class="hero">
        <H1>SNF Printing</H1>
        <P>
          SNF Printing has been facilitating the health care industry for over
          20 years. We provide the easiest access to a variety of medical forms
          and supplies. Our role is to efficiently provide product on call so
          that our valued clients can do their jobs without delay. We thank you
          for the opportunity to serve your needs.
        </P>
      </DIV>

      <Catalog search={props.search} items={props.items} />
    </Layout>
  );
}
