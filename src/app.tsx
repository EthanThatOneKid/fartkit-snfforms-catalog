import { Router } from "@fartlabs/rtx";
import { IndexPageRoute } from "./routes/index.tsx";

export function App() {
  return (
    <Router>
      <IndexPageRoute />
    </Router>
  );
}

const app = <App />;

export default {
  fetch: (request) => {
    return app.fetch(request);
  },
} satisfies Deno.ServeDefaultExport;
