import type { CatalogItem } from "#/lib/snfforms.ts";

export enum CatalogFileType {
  JPG = "jpg",
  WEBP = "webp",
  PDF = "pdf",
}

export interface CatalogService {
  /**
   * getItems gets all catalog items.
   */
  getItems(): Promise<CatalogItem[] | undefined>;

  /**
   * setItems sets all catalog items.
   */
  setItems(items: CatalogItem[]): Promise<void>;

  /**
   * getFile gets a file by type and filename.
   */
  getFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<Uint8Array | undefined>;

  /**
   * setFile sets a file by type and filename.
   */
  setFile(
    type: CatalogFileType,
    filename: string,
    data: Uint8Array,
  ): Promise<void>;

  /**
   * removeFile removes a file by type and filename.
   */
  removeFile(
    type: CatalogFileType,
    filename: string,
  ): Promise<void>;
}
