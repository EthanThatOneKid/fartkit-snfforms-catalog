import { serveDir } from "@std/http/file-server";
import { Get, Router } from "@fartlabs/rtx";
import { IndexPageRoute } from "./routes/index.tsx";
import { CatalogItemPageRoute } from "./routes/item.tsx";
import { EditPageRoute } from "./routes/edit.tsx";
import { ApiRoute } from "./routes/api.tsx";
import { NotFoundRoute } from "./routes/not-found.tsx";
import { kv, KvCatalogService } from "./lib/kv.ts";
import { CatalogFileType } from "./lib/catalog.ts";

function FileRoute() {
  return (
    <Get
      pattern="/files/:filename"
      handler={async (ctx) => {
        const filename = ctx.params?.pathname.groups.filename;
        if (!filename) {
          return new Response("Not Found", { status: 404 });
        }

        const catalogService = new KvCatalogService(kv);

        // Determine file type from extension
        const ext = filename.toLowerCase().split(".").pop();
        let fileType: CatalogFileType;
        let contentType: string;

        if (ext === "jpg" || ext === "jpeg") {
          fileType = CatalogFileType.JPG;
          contentType = "image/jpeg";
        } else if (ext === "webp") {
          fileType = CatalogFileType.WEBP;
          contentType = "image/webp";
        } else if (ext === "pdf") {
          fileType = CatalogFileType.PDF;
          contentType = "application/pdf";
        } else {
          return new Response("Unsupported file type", { status: 400 });
        }

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
      }}
    />
  );
}

function StaticRoute() {
  return (
    <Get
      pattern="/*"
      handler={(ctx) =>
        serveDir(ctx.request, { fsRoot: Deno.args[0] ?? "public" })}
    />
  );
}

export function App() {
  return (
    <Router>
      <IndexPageRoute />
      <EditPageRoute />
      <CatalogItemPageRoute />
      <ApiRoute />
      <FileRoute />
      <StaticRoute />
      <NotFoundRoute />
    </Router>
  );
}

const app = <App />;

export default {
  fetch: (request) => {
    return app.fetch(request);
  },
} satisfies Deno.ServeDefaultExport;
