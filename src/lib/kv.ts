import { get, remove, set } from "@kitsonk/kv-toolbox/blob";
import type { CatalogItem } from "./snfforms.ts";
import type { CatalogService } from "./catalog.ts";
import { CatalogFileType } from "./catalog.ts";

export const kv = await Deno.openKv();

export const CatalogKvKey = {
  CATALOG_ITEMS: "catalog_items",
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
  public constructor(private readonly kv: Deno.Kv) {}

  async seed() {
    const itemsText = await Deno.readTextFile("./public/catalog.json");
    const items = JSON.parse(itemsText) as CatalogItem[];
    await this.setItems(items);
  }

  async getItems(): Promise<CatalogItem[] | undefined> {
    const result = await this.kv.get<CatalogItem[]>([
      CatalogKvKey.CATALOG_ITEMS,
    ]);
    return (result?.value ?? undefined);
  }

  async setItems(items: CatalogItem[]): Promise<void> {
    await this.kv.set([CatalogKvKey.CATALOG_ITEMS], items);
  }

  async addItem(item: CatalogItem): Promise<boolean> {
    const catalogItems = await this.getItems();
    if (!catalogItems) {
      return false;
    }

    // Check if item already exists
    const existingIndex = catalogItems.findIndex((existingItem) =>
      existingItem.formId === item.formId
    );
    if (existingIndex !== -1) {
      return false; // Item already exists
    }

    catalogItems.push(item);
    await this.setItems(catalogItems);
    return true;
  }

  async updateItem(formId: string, updatedItem: CatalogItem): Promise<boolean> {
    const catalogItems = await this.getItems();
    if (!catalogItems) {
      return false;
    }

    const itemIndex = catalogItems.findIndex((item) => item.formId === formId);
    if (itemIndex === -1) {
      return false; // Item not found
    }

    catalogItems[itemIndex] = updatedItem;
    await this.setItems(catalogItems);
    return true;
  }

  async deleteItem(formId: string): Promise<boolean> {
    const catalogItems = await this.getItems();
    if (!catalogItems) {
      return false;
    }

    const itemIndex = catalogItems.findIndex((item) => item.formId === formId);
    if (itemIndex === -1) {
      return false;
    }

    catalogItems.splice(itemIndex, 1);
    await this.setItems(catalogItems);
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
}
