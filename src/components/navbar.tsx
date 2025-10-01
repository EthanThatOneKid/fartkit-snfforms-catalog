import { A, DIV, IMG, NAV } from "@fartlabs/htx";

export function Navbar() {
  return (
    <NAV>
      <DIV class="container">
        <A href="/" class="navbar-brand">
          <IMG
            src="/snf-logo.png"
            alt="SNF Forms Logo"
            class="logo"
            loading="eager"
          />
          <DIV class="brand-text">
            <DIV class="brand-primary">SNF</DIV>
            <DIV class="brand-secondary">Forms</DIV>
          </DIV>
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
