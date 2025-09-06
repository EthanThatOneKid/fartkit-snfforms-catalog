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
      <FORM id="search-form" method="GET" action="/">
        <INPUT type="search" name="search" value={props.search ?? ""} />
        <BUTTON type="submit">Search</BUTTON>
      </FORM>

      <DIV>
        Categories: {categories
          // deno-lint-ignore jsx-key
          .map((category) => <A href={`/?search=${category}`}>{category}</A>)
          .join(", ")}
      </DIV>

      {props.items.length !== 0
        ? (
          <UL>
            {props.items.map((item) => (
              <LI>
                <A href={`/${item.formId}`}>{item.description}</A>
              </LI>
            ))}
          </UL>
        )
        : <P>Search for a form</P>}
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
