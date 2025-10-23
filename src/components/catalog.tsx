import {
  A,
  BUTTON,
  DIV,
  FORM,
  IMG,
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

function getThumbnailPath(previewSrc: string): string {
  const filename = previewSrc.split("/").pop();
  if (!filename) {
    return previewSrc;
  }

  const baseName = filename.replace(/\.(jpg|jpeg)$/i, "");
  return `images/forms/thumbs/${baseName}.webp`;
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
              href={props.search === category ? "/" : `/?search=${category}`}
              class={props.search === category ? "active" : ""}
            >
              {category}
            </A>
          ))
            .join("")}
        </DIV>
      </DIV>

      {props.items.length !== 0
        ? (
          <UL class="catalog-list">
            {props.items
              .map((item) => {
                const imagePreviews = item.previews.filter((preview) =>
                  preview.src.match(/\.(jpg|jpeg)$/i)
                );

                const thumbnailElement = imagePreviews.length > 0
                  ? (
                    <IMG
                      src={getThumbnailPath(imagePreviews[0].src)}
                      alt={imagePreviews[0].alt}
                      class="item-thumbnail"
                      loading="lazy"
                      width="120"
                      decoding="async"
                      fetchpriority="low"
                    />
                  )
                  : (
                    <DIV class="item-thumbnail placeholder">
                      <DIV class="placeholder-content">
                        <SPAN class="placeholder-text">No Preview</SPAN>
                      </DIV>
                    </DIV>
                  );

                return (
                  <LI class="catalog-item">
                    <A
                      href={`/${item.formId}`}
                      class="item-content"
                      style="text-decoration: none; color: inherit;"
                      data-testid={`form-link-${item.formId}`}
                      title={`View details for ${item.formId}`}
                    >
                      <DIV class="item-thumbnails">
                        {thumbnailElement}
                      </DIV>
                      <DIV class="item-info">
                        <DIV class="item-title">
                          {item.description}
                        </DIV>
                        <DIV class="item-details">
                          <DIV class="item-specs">
                            <SPAN class="spec-item">
                              Category: {item.category}
                            </SPAN>
                            <SPAN class="spec-item">Size: {item.size}</SPAN>
                            <SPAN class="spec-item">Paper: {item.paper}</SPAN>
                            <SPAN class="spec-item">Color: {item.color}</SPAN>
                            <SPAN class="spec-item">Sides: {item.sides}</SPAN>
                            <SPAN class="spec-item">Unit: {item.unit}</SPAN>
                            {item.previews.some((preview) => preview.pdf)
                              ? (
                                <SPAN
                                  class="spec-item"
                                  style="cursor: pointer;"
                                  onclick={`event.stopPropagation(); location.href = '/${item.formId}#previews'`}
                                >
                                  PDF: Available
                                </SPAN>
                              )
                              : ""}
                          </DIV>
                        </DIV>
                      </DIV>
                    </A>
                  </LI>
                );
              })
              .join("")}
          </UL>
        )
        : (
          <DIV class="no-results">
            <P class="text-center text-muted">
              {props.search
                ? "No results found. Try a different search term or browse by category."
                : "Enter search query to search SNF Forms"}
            </P>
          </DIV>
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
