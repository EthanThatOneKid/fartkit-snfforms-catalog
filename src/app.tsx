import { serveDir } from "@std/http/file-server";
import { Get, Router } from "@fartlabs/rtx";
import { IndexPageRoute } from "./routes/index.tsx";
import { CatalogPageRoute } from "./routes/catalog.tsx";
import { CatalogItemPageRoute } from "./routes/item.tsx";
import { EditPageRoute } from "./routes/edit.tsx";
import { FileRoute, FilesPageRoute } from "./routes/files.tsx";
import { ApiRoute } from "./routes/api.tsx";
import { NotFoundRoute } from "./routes/not-found.tsx";

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
      <IndexPageRoute />
      <CatalogPageRoute />
      <EditPageRoute />
      <FileRoute />
      <FilesPageRoute />
      <CatalogItemPageRoute />
      <ApiRoute />
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
