import { Get, Router } from "@fartlabs/rtx";
import { NotFoundPage } from "#/components/not-found.tsx";

export function NotFoundRoute() {
  return (
    <Router>
      <Get
        pattern="/*"
        handler={() => {
          return new Response(
            <NotFoundPage />,
            {
              headers: { "Content-Type": "text/html" },
              status: 404,
            },
          );
        }}
      />
    </Router>
  );
}
