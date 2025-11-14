import { Get, Router } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { getFileTypeInfo } from "#/lib/file-utils.ts";
import { CatalogFileType } from "#/lib/catalog.ts";

const catalogService = new KvCatalogService(kv);

export function FilesApiRoute() {
  return (
    <Router>
      <Get
        pattern="/api/files/:filename"
        handler={async (ctx) => {
          const filename = ctx.params?.pathname.groups.filename;
          if (!filename) {
            return new Response("Not Found", { status: 404 });
          }

          // Normalize filename by trimming whitespace
          const normalizedFilename = filename.trim();
          const fileTypeInfo = getFileTypeInfo(normalizedFilename);

          if (!fileTypeInfo) {
            return new Response("Unsupported file type", { status: 400 });
          }

          // Validate file type is supported (JPG, WEBP, or PDF)
          const { fileType, contentType } = fileTypeInfo;
          if (
            fileType !== CatalogFileType.JPG &&
            fileType !== CatalogFileType.WEBP &&
            fileType !== CatalogFileType.PDF
          ) {
            return new Response("Unsupported file type", { status: 400 });
          }

          const fileData = await catalogService.getFile(
            fileType,
            normalizedFilename,
          );

          if (!fileData) {
            return new Response("File not found", { status: 404 });
          }

          return new Response(new Uint8Array(fileData), {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }}
      />
    </Router>
  );
}
