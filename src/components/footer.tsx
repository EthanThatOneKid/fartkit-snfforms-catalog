import { FOOTER } from "@fartlabs/htx/footer";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <FOOTER>
      &copy; SNF Printing {year}.
    </FOOTER>
  );
}
