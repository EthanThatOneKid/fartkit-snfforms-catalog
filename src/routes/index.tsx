import { Get, Router } from "@fartlabs/rtx";
import { A, DIV, H1, IMG, P } from "@fartlabs/htx";
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
    <Layout
      title="SNF Forms"
      description="SNF Forms has been facilitating the health care industry for over 20 years. We provide the easiest access to a variety of medical forms and supplies."
    >
      <DIV class="hero">
        <DIV class="hero-content">
          <IMG src="/home_photo.jpg" alt="SNF Forms" class="home-photo" />
          <DIV class="hero-text">
            <H1>SNF Forms</H1>
            <P>
              SNF Forms has been facilitating the health care industry for over
              20 years. We provide the easiest access to a variety of medical
              forms and supplies. Our role is to efficiently provide product on
              call so that our valued clients can do their jobs without delay.
              We thank you for the opportunity to serve your needs.
            </P>
            <P>
              <A href="/catalog" class="catalog-link">
                Browse our catalog of forms and supplies →
              </A>
            </P>
          </DIV>
        </DIV>
      </DIV>
    </Layout>
  );
}
