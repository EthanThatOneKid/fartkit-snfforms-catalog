import { BODY, HEAD, HTML, META } from "@fartlabs/htx";
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

        {/* Additional head HTML */}
        {props.head ?? ""}
      </HEAD>
      <BODY>
        <Navbar />
        {props.children?.join("") ?? ""}
        <Footer />
      </BODY>
    </HTML>
  );

  return "<!DOCTYPE html>" + layout;
}
