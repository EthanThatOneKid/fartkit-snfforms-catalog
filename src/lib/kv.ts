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
    await this.rebuildOramaIndex();
  }

  async addItem(item: CatalogItem): Promise<boolean> {
    const key = [CatalogKvKey.CATALOG_ITEM, item.formId];

    // Use atomic operation to ensure the item doesn't already exist
    // A null versionstamp means the key doesn't exist
    const result = await this.kv.atomic()
      .check({ key, versionstamp: null })
      .set(key, item)
      .commit();

    if (!result.ok) {
      return false; // Item already exists or check failed
    }

    await this.rebuildOramaIndex();
    return true;
  }

  async updateItem(formId: string, updatedItem: CatalogItem): Promise<boolean> {
    const key = [CatalogKvKey.CATALOG_ITEM, formId];

    // First, get the current item to check it exists and get its versionstamp
    const existing = await this.kv.get<CatalogItem>(key);
    if (!existing.value) {
      return false; // Item not found
    }

    // Use atomic operation to ensure the item hasn't changed since we read it
    // This prevents race conditions where another request modified the item
    const result = await this.kv.atomic()
      .check({ key, versionstamp: existing.versionstamp })
      .set(key, updatedItem)
      .commit();

    if (!result.ok) {
      return false; // Item was modified by another request, update failed
    }

    await this.rebuildOramaIndex();
    return true;
  }

  async deleteItem(formId: string): Promise<boolean> {
    const key = [CatalogKvKey.CATALOG_ITEM, formId];

    // First, get the current item to check it exists and get its versionstamp
    const existing = await this.kv.get<CatalogItem>(key);
    if (!existing.value) {
      return false; // Item not found
    }

    // Use atomic operation to ensure the item hasn't changed since we read it
    // This prevents race conditions where another request modified the item
    const result = await this.kv.atomic()
      .check({ key, versionstamp: existing.versionstamp })
      .delete(key)
      .commit();

    if (!result.ok) {
      return false; // Item was modified by another request, delete failed
    }

    await this.rebuildOramaIndex();
    return true;
  }

  /**
   * updateItemFormId atomically moves an item from one formId to another.
   * This prevents race conditions when changing a formId.
   * @returns true if successful, false if the old item doesn't exist or the new formId already exists
   */
  async updateItemFormId(
    oldFormId: string,
    newFormId: string,
    updatedItem: CatalogItem,
  ): Promise<boolean> {
    const oldKey = [CatalogKvKey.CATALOG_ITEM, oldFormId];
    const newKey = [CatalogKvKey.CATALOG_ITEM, newFormId];

    // Get both keys to check their state
    // Using separate get calls for better type inference
    const oldEntry = await this.kv.get<CatalogItem>(oldKey);
    const newEntry = await this.kv.get<CatalogItem>(newKey);

    // Old item must exist
    if (!oldEntry.value) {
      return false;
    }

    // New formId must not already exist
    if (newEntry.value) {
      return false;
    }

    // Atomically delete the old key and create the new key
    // This ensures both operations succeed or both fail
    const result = await this.kv.atomic()
      .check({ key: oldKey, versionstamp: oldEntry.versionstamp })
      .check({ key: newKey, versionstamp: null })
      .delete(oldKey)
      .set(newKey, updatedItem)
      .commit();

    if (!result.ok) {
      return false; // One of the checks failed (item was modified or new formId was created)
    }

    await this.rebuildOramaIndex();
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
   * Returns the cached index if available, otherwise rebuilds it.
   */
  async getOramaIndex(): Promise<Orama | null> {
    // If we have a cached index, return it.
    if (this.oramaIndex) {
      return this.oramaIndex;
    }

    // Rebuild the index.
    return await this.rebuildOramaIndex();
  }

  /**
   * rebuildOramaIndex rebuilds the Orama search index and caches it.
   * This is called automatically when catalog items are updated.
   */
  private async rebuildOramaIndex(): Promise<Orama | null> {
    const items = await this.getItems();
    if (!items) {
      this.oramaIndex = null;
      return null;
    }

    // Create a new index.
    this.oramaIndex = await createOrama(items);
    return this.oramaIndex;
  }
}
