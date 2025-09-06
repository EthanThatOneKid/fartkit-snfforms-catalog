import {
  A,
  BUTTON,
  FORM,
  INPUT,
  LI,
  P,
  SCRIPT,
  SECTION,
  UL,
} from "@fartlabs/htx";
import type { CatalogItem } from "#/lib/snfforms.ts";

export interface CatalogProps {
  search: string | null;
  items: CatalogItem[];
}

export function Catalog(props: CatalogProps) {
  return (
    <SECTION>
      <FORM method="GET" action="/">
        <INPUT type="search" name="search" value={props.search ?? ""} />
        <BUTTON type="submit">Search</BUTTON>
      </FORM>

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

// TODO: Implement performant client-side search. Migrate current server-side search to fallback when client-side search is not available.
const catalogScript = ``;
