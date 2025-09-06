import { Get, Router } from "@fartlabs/rtx";
import { H1, P } from "@fartlabs/htx";
import { Layout } from "#/components/layout.tsx";
import { RedirectRoute } from "#/components/redirect.tsx";

export function IndexPageRoute() {
  return (
    <Router>
      <Get
        pattern="/"
        handler={(_ctx) => {
          return new Response(
            <IndexPage />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <RedirectRoute pattern="(/)*" redirectUrl="/" />
    </Router>
  );
}

export function IndexPage() {
  return (
    <Layout>
      <H1>SNF Forms</H1>

      <P>
        SNF Forms has been facilitating the health care industry for over 20
        years. We provide the easiest access to a variety of medical forms and
        supplies. Our role is to efficiently provide product on call so that our
        valued clients can do their jobs without delay. We thank you for the
        opportunity to serve your needs.
      </P>
    </Layout>
  );
}
