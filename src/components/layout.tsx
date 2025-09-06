import {
  A,
  BODY,
  DIV,
  HEAD,
  HTML,
  LINK,
  MAIN,
  META,
  SCRIPT,
  TITLE,
} from "@fartlabs/htx";
import { Navbar } from "./navbar.tsx";
import { Footer } from "./footer.tsx";

export interface LayoutProps {
  head?: string;
  title?: string;
  description?: string;

  // deno-lint-ignore no-explicit-any
  children?: any[];
}

export function Layout(props: LayoutProps) {
  const title = props.title
    ? `${props.title} | SNF Forms`
    : "SNF Forms - Medical Forms & Supplies";
  const description = props.description ||
    "Professional medical forms and supplies for healthcare industry. Quality printing services for SNF, nursing homes, and medical facilities.";

  const layout = (
    <HTML lang="en">
      <HEAD>
        <META charset="utf-8" />
        <META name="viewport" content="width=device-width, initial-scale=1" />
        <TITLE>{title}</TITLE>
        <META name="description" content={description} />
        <META
          name="keywords"
          content="medical forms, SNF forms, healthcare supplies, nursing home forms, medical printing, healthcare industry"
        />
        <META name="author" content="SNF Forms" />
        <META name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <META name="og:type" content="website" />
        <META name="og:title" content={title} />
        <META name="og:description" content={description} />
        <META name="og:image" content="/snf-logo.png" />
        <META name="og:site_name" content="SNF Forms" />

        {/* Twitter */}
        <META name="twitter:card" content="summary_large_image" />
        <META name="twitter:title" content={title} />
        <META name="twitter:description" content={description} />
        <META name="twitter:image" content="/snf-logo.png" />

        {/* Preload critical resources */}
        <LINK rel="preload" href="/snf.css" as="style" />
        <LINK rel="preload" href="/snf-logo.png" as="image" />

        {/* PWA Manifest */}
        <LINK rel="manifest" href="/manifest.json" />

        {/* Stylesheet */}
        <LINK rel="stylesheet" href="/snf.css" />

        {/* Structured Data */}
        <SCRIPT type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "SNF Forms",
            "alternateName": "SNF Printing",
            "url": "https://snfforms.com",
            "logo": "https://snfforms.com/snf-logo.png",
            "description": description,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "15532 Computer Lane",
              "addressLocality": "Huntington Beach",
              "addressRegion": "CA",
              "addressCountry": "US",
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+1-714-901-6868",
              "contactType": "customer service",
              "areaServed": "US",
              "availableLanguage": "English",
            },
          })}
        </SCRIPT>

        {/* Service Worker Registration */}
        <SCRIPT>
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                  console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                  console.log('SW registration failed: ', registrationError);
                });
            });
          }`}
        </SCRIPT>

        {/* Additional head HTML */}
        {props.head ?? ""}
      </HEAD>
      <BODY>
        <A href="#main-content" class="skip-link">Skip to main content</A>
        <Navbar />
        <MAIN id="main-content" class="main-content">
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
