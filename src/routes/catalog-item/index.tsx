import { Get, Router } from "@fartlabs/rtx";
import {
  A,
  DIV,
  H1,
  H2,
  IMG,
  LI,
  P,
  TABLE,
  TBODY,
  TD,
  TH,
  TR,
  UL,
} from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectPage } from "#/components/redirect.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { findCatalogItem } from "#/lib/catalog.ts";

export function CatalogItemPageRoute() {
  return (
    <Router>
      <Get
        pattern="/:itemId([a-zA-Z0-9-]{3,10})"
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
    <Layout
      title={props.item.formId}
      description={`${props.item.description} - ${props.item.category} medical form. Size: ${props.item.size}, Paper: ${props.item.paper}, Color: ${props.item.color}`}
    >
      <DIV class="card">
        <DIV class="card-header">
          <H1 class="card-title">{props.item.formId}</H1>
          <P class="text-muted mb-0">Form Details</P>
        </DIV>

        <TABLE>
          <TBODY>
            <TR>
              <TH>Description</TH>
              <TD>{props.item.description}</TD>
            </TR>
            <TR>
              <TH>Category</TH>
              <TD>{props.item.category}</TD>
            </TR>
            <TR>
              <TH>Size</TH>
              <TD>{props.item.size}</TD>
            </TR>
            <TR>
              <TH>Paper</TH>
              <TD>{props.item.paper}</TD>
            </TR>
            <TR>
              <TH>Color</TH>
              <TD>{props.item.color}</TD>
            </TR>
            <TR>
              <TH>Sides</TH>
              <TD>{props.item.sides}</TD>
            </TR>
            <TR>
              <TH>Unit</TH>
              <TD>{props.item.unit}</TD>
            </TR>
          </TBODY>
        </TABLE>
      </DIV>

      {props.item.previews.length > 0
        ? (
          <DIV class="card">
            <DIV class="card-header">
              <H2 class="card-title">Form Previews</H2>
              <P class="text-muted mb-0">
                Click on any preview to view the full PDF
              </P>
            </DIV>
            <UL class="preview-list">
              {/* deno-lint-ignore jsx-key */}
              {props.item.previews.map((preview) => {
                const img = (
                  <IMG
                    src={preview.src}
                    alt={preview.alt || `${props.item.formId} form preview`}
                    loading="lazy"
                  />
                );
                return (
                  <LI class="preview-item">
                    {preview.pdf ? <A href={preview.pdf}>{img}</A> : img}
                  </LI>
                );
              })}
            </UL>
          </DIV>
        )
        : ""}
    </Layout>
  );
}
