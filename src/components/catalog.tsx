import {
  A,
  BUTTON,
  DIV,
  FORM,
  INPUT,
  LI,
  P,
  SCRIPT,
  SECTION,
  SPAN,
  UL,
} from "@fartlabs/htx";
import type { CatalogItem } from "#/lib/snfforms.ts";

export const categories = [
  "Activities/Social Services",
  "Administration",
  "Dietary",
  "Employee/Human Resources",
  "Medical Records",
  "Nursing",
];

export interface CatalogProps {
  search: string | null;
  items: CatalogItem[];
}

export function Catalog(props: CatalogProps) {
  return (
    <SECTION>
      <DIV class="categories">
        <FORM id="search-form" class="search-form" method="GET" action="/">
          <INPUT
            type="search"
            name="search"
            value={props.search ?? ""}
            placeholder="Search forms by name, category, or description..."
          />
          <BUTTON type="submit">Search</BUTTON>
        </FORM>

        <DIV class="category-links">
          {categories.map((category) => (
            <A
              href={`/?search=${category}`}
              class={props.search === category ? "active" : ""}
            >
              {category}
            </A>
          ))}
        </DIV>
      </DIV>

      {props.items.length !== 0
        ? (
          <UL class="catalog-list">
            {props.items.map((item) => (
              <LI class="catalog-item">
                <A href={`/${item.formId}`}>{item.description}</A>
                <DIV class="item-details">
                  <DIV class="item-specs">
                    <SPAN class="spec-item">Category: {item.category}</SPAN>
                    <SPAN class="spec-item">Size: {item.size}</SPAN>
                    <SPAN class="spec-item">Paper: {item.paper}</SPAN>
                    <SPAN class="spec-item">Color: {item.color}</SPAN>
                    <SPAN class="spec-item">Sides: {item.sides}</SPAN>
                    <SPAN class="spec-item">Unit: {item.unit}</SPAN>
                    {item.previews.some((preview) => preview.pdf)
                      ? <SPAN class="spec-item">PDF preview</SPAN>
                      : ""}
                  </DIV>
                </DIV>
              </LI>
            ))}
          </UL>
        )
        : (
          <P class="text-center text-muted">
            Search for a form using the search box above or browse by category
          </P>
        )}
    </SECTION>
  );
}

export function CatalogScript() {
  return <SCRIPT type="module">{catalogScript}</SCRIPT>;
}

const catalogScript = `
// TODO: Implement performant client-side search.
// Migrate current server-side search to fallback when client-side search is not available.
// import { create, search, insert } from 'https://unpkg.com/@orama/orama@latest/dist/index.js'

// const db = await create({
//   schema: {
//     formId: "string",
//     category: "string",
//     description: "string",
//     size: "string",
//     paper: "string",
//     color: "string",
//     sides: "string",
//     unit: "string",
//   },
// });

// const catalogItems = await fetch("/catalog.json").then(response => response.json());
// for (const catalogItem of catalogItems) {
//   await insert(db, catalogItem);
// }`;
