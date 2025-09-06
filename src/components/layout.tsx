import { BODY, DIV, HEAD, HTML, LINK, MAIN, META } from "@fartlabs/htx";
import { Navbar } from "./navbar.tsx";
import { Footer } from "./footer.tsx";

export interface LayoutProps {
  head?: string;

  // deno-lint-ignore no-explicit-any
  children?: any[];
}

export function Layout(props: LayoutProps) {
  const layout = (
    <HTML>
      <HEAD>
        <META charset="utf-8" />
        <META name="viewport" content="width=device-width, initial-scale=1" />
        <META
          name="description"
          content="SNF Forms - Medical forms and supplies for healthcare industry"
        />
        <LINK rel="stylesheet" href="/snf.css" />

        {/* Additional head HTML */}
        {props.head ?? ""}
      </HEAD>
      <BODY>
        <Navbar />
        <MAIN class="main-content">
          <DIV class="container">
            {props.children?.join("") ?? ""}
          </DIV>
        </MAIN>
        <Footer />
      </BODY>
    </HTML>
  );

  return "<!DOCTYPE html>" + layout;
}
