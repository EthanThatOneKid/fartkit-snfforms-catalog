import { serveDir } from "@std/http/file-server";
import { Get, Router } from "@fartlabs/rtx";
// Page routes
import { IndexPageRoute } from "./routes/pages/index.tsx";
import { CatalogPageRoute } from "./routes/pages/catalog.tsx";
import { CatalogItemPageRoute } from "./routes/pages/item.tsx";
import { EditPageRoute } from "./routes/pages/edit.tsx";
import { FilesPageRoute } from "./routes/pages/files.tsx";
import { NotFoundRoute } from "./routes/pages/not-found.tsx";
// API routes
import { CatalogApiRoute } from "./routes/api/catalog.tsx";
import { ItemsApiRoute } from "./routes/api/items.tsx";
import { PreviewsApiRoute } from "./routes/api/previews.tsx";
import { AltTextApiRoute } from "./routes/api/alt-text.tsx";
// File serving route
import { FileRoute } from "./routes/files.tsx";

function StaticRoute() {
  return (
    <Get
      pattern="/*"
      handler={(ctx) =>
        serveDir(ctx.request, { fsRoot: Deno.args[0] ?? "public" })}
    />
  );
}

function FaviconRoute() {
  return (
    <Get
      pattern="/favicon.ico"
      handler={() =>
        new Response(null, {
          status: 302,
          headers: { Location: "/snf-logo.png" },
        })}
    />
  );
}

export function App() {
  return (
    <Router>
      {/* Page routes */}
      <IndexPageRoute />
      <CatalogPageRoute />
      <EditPageRoute />
      <FilesPageRoute />
      <CatalogItemPageRoute />

      {/* API routes */}
      <CatalogApiRoute />
      <ItemsApiRoute />
      <PreviewsApiRoute />
      <AltTextApiRoute />

      {/* File serving */}
      <FileRoute />

      {/* Static and utility routes */}
      <FaviconRoute />
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
