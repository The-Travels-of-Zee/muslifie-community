import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "./provider";

export const metadata = {
  metadataBase: new URL("https://community.muslifie.com/"),
  title: "Muslifie",
  description: "Muslifie Community - All-in-One travel app for All.",
  openGraph: {
    title: "Muslifie",
    description: "Muslifie Community - All-in-One travel app for All.",
    url: "./",
    siteName: "Muslifie",
    images: ["/favicon/icon-512x512.png"],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    title: "Muslifie",
    description: "Muslifie Community - All-in-One travel app for All.",
    card: "summary_large_image",
    images: ["/favicon/icon-512x512.png"],
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon/favicon.ico" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon/apple-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon/icon-512x512.png" />
        <link rel="manifest" href="/favicon/manifest.json" />
      </head>

      <body className={"font-notosans antialiased"}>
        <AuthProvider>{children}</AuthProvider>
        {/* {children} */}

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-script" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
