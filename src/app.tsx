import { serveDir } from "@std/http/file-server";
import { Get, Router } from "@fartlabs/rtx";
import { IndexPageRoute } from "./routes/index.tsx";
import { CatalogItemPageRoute } from "./routes/catalog-item/index.tsx";

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
      <CatalogItemPageRoute />
      <StaticRoute />
    </Router>
  );
}

const app = <App />;

export default {
  fetch: (request) => {
    return app.fetch(request);
  },
} satisfies Deno.ServeDefaultExport;
