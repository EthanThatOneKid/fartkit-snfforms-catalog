import { get, remove, set } from "@kitsonk/kv-toolbox/blob";
import type { CatalogItem } from "./snfforms.ts";
import type { CatalogService } from "./catalog.ts";
import { CatalogFileType } from "./catalog.ts";

export const key = await Deno.openKv();

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

  async getItems(): Promise<CatalogItem[] | undefined> {
    const result = await this.kv.get<CatalogItem[]>([
      CatalogKvKey.CATALOG_ITEMS,
    ]);
    return (result?.value ?? undefined);
  }

  async setItems(items: CatalogItem[]): Promise<void> {
    await this.kv.set([CatalogKvKey.CATALOG_ITEMS], items);
  }

  async getFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<Uint8Array | undefined> {
    const result = await get(key, fileKey(type, filename));
    return result?.value ?? undefined;
  }

  async setFile(
    type: CatalogFileType,
    filename: string,
    data: Uint8Array,
  ): Promise<void> {
    await set(key, fileKey(type, filename), data);
  }

  async removeFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<void> {
    await remove(key, fileKey(type, filename));
  }
}
