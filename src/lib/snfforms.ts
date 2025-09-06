export interface CatalogItem {
  formId: string;
  category: string;
  description: string;
  size: string;
  paper: string;
  color: string;
  sides: string;
  unit: string;
  previews: CatalogItemPreview[];
}

export interface CatalogItemPreview {
  src: string;
  alt: string;
  pdf?: string;
}
