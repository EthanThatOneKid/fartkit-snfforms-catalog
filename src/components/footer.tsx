import { A, DIV, FOOTER, H3, P } from "@fartlabs/htx";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <FOOTER>
      <DIV class="container">
        <DIV class="footer-content">
          <DIV class="footer-section">
            <H3>Contact Us</H3>
            <P>Corporate Headquarters</P>
            <P>15532 Computer Lane</P>
            <P>Huntington Beach, CA</P>
            <P>
              <A href="tel:+17149016868">Phone: (714) 901-6868</A>
            </P>
            <P>Fax: (714) 901-6858</P>
          </DIV>
          <DIV class="footer-section">
            <P>&copy; SNF Printing {year}. All rights reserved.</P>
          </DIV>
        </DIV>
      </DIV>
    </FOOTER>
  );
}
