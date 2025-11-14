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

          const fileTypeInfo = getFileTypeInfo(filename);
          if (!fileTypeInfo) {
            return new Response("Unsupported file type", { status: 400 });
          }

          const { fileType, contentType } = fileTypeInfo;

          const fileData = await catalogService.getFile(fileType, filename);
          if (!fileData) {
            return new Response("File not found", { status: 404 });
          }

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
