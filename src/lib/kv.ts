import { get, remove, set } from "@kitsonk/kv-toolbox/blob";
import type { CatalogItem } from "./snfforms.ts";
import type { CatalogService } from "./catalog.ts";
import { CatalogFileType } from "./catalog.ts";
import { createOrama, type Orama } from "./orama.ts";

export const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));

export const CatalogKvKey = {
  CATALOG_ITEM: "catalog_item",
  CATALOG_FILES_JPG: "catalog_files_jpg",
  CATALOG_FILES_WEBP: "catalog_files_webp",
  CATALOG_FILES_PDF: "catalog_files_pdf",
};

function fileKey(type: CatalogFileType, filename: string) {
  return [
    ({
      [CatalogFileType.JPG]: CatalogKvKey.CATALOG_FILES_JPG,
      [CatalogFileType.WEBP]: CatalogKvKey.CATALOG_FILES_WEBP,
      [CatalogFileType.PDF]: CatalogKvKey.CATALOG_FILES_PDF,
    })[type],
    filename,
  ];
}

export class KvCatalogService implements CatalogService {
  private oramaIndex: Orama | null = null;
  private lastItemsHash: string | null = null;

  public constructor(private readonly kv: Deno.Kv) {}

  async getItems(): Promise<CatalogItem[] | undefined> {
    const items: CatalogItem[] = [];
    const entries = this.kv.list<CatalogItem>({
      prefix: [CatalogKvKey.CATALOG_ITEM],
    });

    for await (const entry of entries) {
      if (entry.value) {
        items.push(entry.value);
      }
    }

    return items.length > 0 ? items : undefined;
  }

  async setItems(items: CatalogItem[]): Promise<void> {
    // Store each item individually
    for (const item of items) {
      await this.kv.set([CatalogKvKey.CATALOG_ITEM, item.formId], item);
    }
    this.invalidateOramaIndex();
  }

  async addItem(item: CatalogItem): Promise<boolean> {
    // Check if the item already exists
    const existing = await this.kv.get<CatalogItem>([
      CatalogKvKey.CATALOG_ITEM,
      item.formId,
    ]);
    if (existing.value) {
      return false; // Item already exists
    }

    await this.kv.set([CatalogKvKey.CATALOG_ITEM, item.formId], item);
    this.invalidateOramaIndex();
    return true;
  }

  async updateItem(formId: string, updatedItem: CatalogItem): Promise<boolean> {
    // Check if the item exists
    const existing = await this.kv.get<CatalogItem>([
      CatalogKvKey.CATALOG_ITEM,
      formId,
    ]);
    if (!existing.value) {
      return false; // Item not found
    }

    await this.kv.set([CatalogKvKey.CATALOG_ITEM, formId], updatedItem);
    this.invalidateOramaIndex();
    return true;
  }

  async deleteItem(formId: string): Promise<boolean> {
    // Check if the item exists
    const existing = await this.kv.get<CatalogItem>([
      CatalogKvKey.CATALOG_ITEM,
      formId,
    ]);
    if (!existing.value) {
      return false; // Item not found
    }

    await this.kv.delete([CatalogKvKey.CATALOG_ITEM, formId]);
    this.invalidateOramaIndex();
    return true;
  }

  async getFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<Uint8Array | undefined> {
    const result = await get(this.kv, fileKey(type, filename));
    return result?.value ?? undefined;
  }

  async setFile(
    type: CatalogFileType,
    filename: string,
    data: Uint8Array,
  ): Promise<void> {
    await set(this.kv, fileKey(type, filename), data);
  }

  async removeFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<void> {
    await remove(this.kv, fileKey(type, filename));
  }

  /**
   * getOramaIndex gets the Orama search index, creating it if necessary.
   */
  async getOramaIndex(): Promise<Orama | null> {
    const items = await this.getItems();
    if (!items) {
      return null;
    }

    // Create a comprehensive hash of the items to detect changes.
    const itemsHash = JSON.stringify(
      items.map((item) => ({
        formId: item.formId,
        category: item.category,
        description: item.description,
        size: item.size,
        paper: item.paper,
        color: item.color,
        sides: item.sides,
        unit: item.unit,
        previews: item.previews,
      })).toSorted((a, b) => a.formId.localeCompare(b.formId)),
    );

    // If we have a cached index and the items haven't changed, return it.
    if (this.oramaIndex && this.lastItemsHash === itemsHash) {
      return this.oramaIndex;
    }

    // Create a new index.
    this.oramaIndex = await createOrama(items);
    this.lastItemsHash = itemsHash;
    return this.oramaIndex;
  }

  /**
   * invalidateOramaIndex clears the cached Orama index.
   */
  private invalidateOramaIndex(): void {
    this.oramaIndex = null;
    this.lastItemsHash = null;
  }
}
