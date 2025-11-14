import { Get } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { getFileTypeInfo } from "#/lib/file-utils.ts";

const catalogService = new KvCatalogService(kv);

export function FileRoute() {
  return (
    <Get
      pattern="/files/:filename"
      handler={async (ctx) => {
        try {
          const filename = ctx.params?.pathname.groups.filename;
          if (!filename) {
            return new Response("Not Found", { status: 404 });
          }

          // Normalize filename by trimming whitespace to match seed script behavior
          const normalizedFilename = filename.trim();

          const fileTypeInfo = getFileTypeInfo(normalizedFilename);
          if (!fileTypeInfo) {
            return new Response("Unsupported file type", { status: 400 });
          }

          const { fileType, contentType } = fileTypeInfo;

          const fileData = await catalogService.getFile(
            fileType,
            normalizedFilename,
          );
          if (!fileData) {
            return new Response("File not found", { status: 404 });
          }

          // Create a new Uint8Array to ensure proper type compatibility with Response
          return new Response(new Uint8Array(fileData), {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (error) {
          console.error("Error serving file:", error);
          return new Response("Internal Server Error", { status: 500 });
        }
      }}
    />
  );
}
