import { Get, Router } from "@fartlabs/rtx";
import { H1, TABLE, TBODY, TD, TH, TR } from "@fartlabs/htx";
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
      <TABLE>
        <TBODY>
          <TR>
            <TH align="left">Description</TH>
            <TD>{props.item.description}</TD>
          </TR>
          <TR>
            <TH align="left">Category</TH>
            <TD>{props.item.category}</TD>
          </TR>
          <TR>
            <TH align="left">Size</TH>
            <TD>{props.item.size}</TD>
          </TR>
          <TR>
            <TH align="left">Paper</TH>
            <TD>{props.item.paper}</TD>
          </TR>
          <TR>
            <TH align="left">Color</TH>
            <TD>{props.item.color}</TD>
          </TR>
          <TR>
            <TH align="left">Sides</TH>
            <TD>{props.item.sides}</TD>
          </TR>
          <TR>
            <TH align="left">Unit</TH>
            <TD>{props.item.unit}</TD>
          </TR>
        </TBODY>
      </TABLE>
    </Layout>
  );
}
