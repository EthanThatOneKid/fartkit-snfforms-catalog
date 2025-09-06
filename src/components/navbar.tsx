import { A, DIV, IMG, NAV } from "@fartlabs/htx";

export function Navbar() {
  return (
    <NAV>
      <DIV class="container">
        <A href="/" class="navbar-brand">
          <IMG
            src="/snf-logo.png"
            alt="SNF Printing Logo"
            class="logo"
            loading="eager"
          />
          <DIV class="brand-text">
            <DIV class="brand-primary">SNF</DIV>
            <DIV class="brand-secondary">Printing</DIV>
          </DIV>
        </A>
        <A href="tel:+17149016868" class="phone-link">
          (714) 901-6868
        </A>
      </DIV>
    </NAV>
  );
}
