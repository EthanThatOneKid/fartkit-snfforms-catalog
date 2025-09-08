import { A, DIV, H1, LI, P, STRONG, UL } from "@fartlabs/htx";
import { Layout } from "./layout.tsx";

export interface NotFoundPageProps {
  itemId?: string;
  message?: string;
}

export function NotFoundPage(props: NotFoundPageProps) {
  const title = "Page Not Found";
  const description = "The requested page or form could not be found.";

  return (
    <Layout
      title={title}
      description={description}
    >
      <DIV class="card text-center">
        <DIV class="card-header">
          <H1 class="card-title">404 - Page Not Found</H1>
          <P class="text-muted mb-0">
            Sorry, we couldn't find what you're looking for
          </P>
        </DIV>

        <DIV class="card-body">
          {props.itemId && (
            <P class="text-muted">
              The form <STRONG>{props.itemId}</STRONG>{" "}
              was not found in our catalog.
            </P>
          )}

          {props.message && (
            <P class="text-muted">
              {props.message}
            </P>
          )}

          <DIV class="mt-4">
            <A href="/" class="btn btn-primary">
              ← Back to Catalog
            </A>
          </DIV>

          <DIV class="mt-3">
            <P class="text-muted">
              You can also try:
            </P>
            <UL class="list-unstyled">
              <LI>
                <A href="/">Browse all forms</A>
              </LI>
              <LI>
                <A href="/?search=Administration">Administration forms</A>
              </LI>
              <LI>
                <A href="/?search=Nursing">Nursing forms</A>
              </LI>
              <LI>
                <A href="/?search=Medical Records">Medical Records forms</A>
              </LI>
            </UL>
          </DIV>
        </DIV>
      </DIV>
    </Layout>
  );
}
