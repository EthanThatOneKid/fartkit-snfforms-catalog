import { Get, Router } from "@fartlabs/rtx";
import { H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";
import { Catalog } from "#/components/catalog.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { searchCatalog } from "#/lib/orama.ts";

export function IndexPageRoute() {
  return (
    <Router>
      <Get
        pattern="/"
        handler={async (ctx) => {
          const url = new URL(ctx.request.url);
          const search = url.searchParams.get("search");
          const items = search ? await searchCatalog(search) : [];
          return new Response(
            <IndexPage items={items} search={search} />,
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
    <Layout>
      <H1>SNF Forms</H1>

      <P>
        SNF Forms has been facilitating the health care industry for over 20
        years. We provide the easiest access to a variety of medical forms and
        supplies. Our role is to efficiently provide product on call so that our
        valued clients can do their jobs without delay. We thank you for the
        opportunity to serve your needs.
      </P>

      <Catalog items={props.items} search={props.search} />
    </Layout>
  );
}
