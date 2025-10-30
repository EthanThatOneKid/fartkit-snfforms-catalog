import { A, DIV, IMG, NAV } from "@fartlabs/htx";

export function Navbar() {
  return (
    <NAV>
      <DIV class="container">
        <A
          href="/"
          class="navbar-brand"
          data-testid="logo-link"
          title="Go to homepage"
        >
          <IMG
            src="/snf-logo.png"
            alt="SNF Forms"
            class="logo"
            loading="eager"
            data-testid="logo-image"
          />
        </A>
        <DIV style="display: flex; gap: 1rem; align-items: center;">
          <A href="tel:+17149016868" class="phone-link">
            (714) 901-6868
          </A>
        </DIV>
      </DIV>
    </NAV>
  );
}
