import { Get, Router } from "@fartlabs/rtx";
import { H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectPage } from "#/components/redirect.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { findCatalogItem } from "#/lib/catalog.ts";

export function CatalogItemPageRoute() {
  return (
    <Router>
      <Get
        pattern="/:itemId"
        handler={(ctx) => {
          const itemId = ctx.params?.pathname.groups.itemId;
          if (!itemId) {
            return new Response(
              <RedirectPage redirectUrl="/" />,
              { headers: { "Content-Type": "text/html" } },
            );
          }

          const item = findCatalogItem(itemId);
          if (!item) {
            throw new Error(`Catalog item not found: ${itemId}`);
          }

          return new Response(
            <CatalogItemPage item={item} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />
    </Router>
  );
}

interface CatalogItemPageProps {
  item: CatalogItem;
}

export function CatalogItemPage(props: CatalogItemPageProps) {
  return (
    <Layout>
      <H1>{props.item.formId}</H1>
      <P>Description: {props.item.description}</P>
      <P>Category: {props.item.category}</P>
      <P>Size: {props.item.size}</P>
      <P>Paper: {props.item.paper}</P>
      <P>Color: {props.item.color}</P>
      <P>Sides: {props.item.sides}</P>
      <P>Unit: {props.item.unit}</P>
    </Layout>
  );
}
