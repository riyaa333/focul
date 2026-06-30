import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F0E4" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1410" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL("https://focul.co"),
  title: "Focul | Close the loop on your work day",
  description:
    "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds. AI captures your next tasks before the context decays.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Focul",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.png?v=5", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://focul.co",
    siteName: "Focul",
    title: "Focul | Close the loop on your work day",
    description:
      "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds. AI captures your next tasks before the context decays.",
    images: [
      {
        url: "/focul-og.png",
        width: 1200,
        height: 627,
        alt: "Focul | Close the loop on your work day",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Focul | Close the loop on your work day",
    description:
      "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds. AI captures your next tasks before the context decays.",
    images: ["/focul-og.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,450,500,600,650,700&display=swap"
          rel="stylesheet"
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wexo0ylg56");`
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
