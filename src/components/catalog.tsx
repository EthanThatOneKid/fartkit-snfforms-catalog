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
import { getFormFiles } from "#/lib/file-manager.ts";

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

export interface CatalogItemWithFiles extends CatalogItem {
  uploadedFiles: import("#/lib/file-manager.ts").FileMetadata[];
}

/**
 * Load catalog items with their uploaded files
 */
export async function loadCatalogItemsWithFiles(items: CatalogItem[]): Promise<CatalogItemWithFiles[]> {
  const itemsWithFiles = await Promise.all(
    items.map(async (item) => {
      const uploadedFiles = await getFormFiles(item.formId);
      return {
        ...item,
        uploadedFiles
      };
    })
  );
  return itemsWithFiles;
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
              <CatalogItemWithThumbnail item={item} />
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

interface CatalogItemWithThumbnailProps {
  item: CatalogItem;
}

function CatalogItemWithThumbnail(props: CatalogItemWithThumbnailProps) {
  return (
    <LI class="catalog-item">
      <DIV class="item-content">
        <DIV class="item-thumbnails">
          {(() => {
            const imagePreviews = props.item.previews.filter((preview) =>
              preview.src.match(/\.(jpg|jpeg)$/i)
            );
            if (imagePreviews.length > 0) {
              const preview = imagePreviews[0];
              return (
                <A href={`/${props.item.formId}`}>
                  <IMG
                    src={getThumbnailPath(preview.src)}
                    alt={preview.alt}
                    class="item-thumbnail"
                    loading="lazy"
                    width="120"
                    decoding="async"
                    fetchpriority="low"
                  />
                </A>
              );
            } else {
              return (
                <A href={`/${props.item.formId}`}>
                  <DIV class="item-thumbnail placeholder">
                    <DIV class="placeholder-content">
                      <SPAN class="placeholder-text">No Preview</SPAN>
                    </DIV>
                  </DIV>
                </A>
              );
            }
          })()}
        </DIV>
        <DIV class="item-info">
          <A href={`/${props.item.formId}`} class="item-title">
            {props.item.description}
          </A>
          <DIV class="item-details">
            <DIV class="item-specs">
              <SPAN class="spec-item">Category: {props.item.category}</SPAN>
              <SPAN class="spec-item">Size: {props.item.size}</SPAN>
              <SPAN class="spec-item">Paper: {props.item.paper}</SPAN>
              <SPAN class="spec-item">Color: {props.item.color}</SPAN>
              <SPAN class="spec-item">Sides: {props.item.sides}</SPAN>
              <SPAN class="spec-item">Unit: {props.item.unit}</SPAN>
              {props.item.previews.some((preview) => preview.pdf)
                ? (
                  <SPAN
                    class="spec-item"
                    style="cursor: pointer;"
                    onclick={`location.href = '/${props.item.formId}#previews'`}
                  >
                    PDF: Available
                  </SPAN>
                )
                : ""}
            </DIV>
          </DIV>
        </DIV>
      </DIV>
    </LI>
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
