import { Get, Router } from "@fartlabs/rtx";
import { H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";
import { Catalog, CatalogScript } from "#/components/catalog.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { searchCatalog } from "#/lib/orama.ts";
import { findCatalogItem } from "#/lib/catalog.ts";

export function IndexPageRoute() {
  return (
    <Router>
      <Get
        pattern="/"
        handler={async (ctx) => {
          const url = new URL(ctx.request.url);
          const search = url.searchParams.get("search");
          const hits = search ? (await searchCatalog(search)).hits : [];
          const items = hits.map((result) => {
            const item = findCatalogItem(result.document.formId);
            if (!item) {
              throw new Error(
                `Catalog item not found: ${result.document.formId}`,
              );
            }

            return item;
          });

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
    <Layout head={<CatalogScript />}>
      <H1>SNF Forms</H1>

      <P>
        SNF Forms has been facilitating the health care industry for over 20
        years. We provide the easiest access to a variety of medical forms and
        supplies. Our role is to efficiently provide product on call so that our
        valued clients can do their jobs without delay. We thank you for the
        opportunity to serve your needs.
      </P>

      <Catalog search={props.search} items={props.items} />
    </Layout>
  );
}
