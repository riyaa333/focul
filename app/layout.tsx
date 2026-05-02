import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://focul.co"),
  title: "Focul — Close the loop on your work day",
  description:
    "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds — AI captures your next tasks before the context decays.",
  icons: {
    icon: [
      { url: "/favicon.png?v=2", type: "image/png" },
    ],
    apple: "/favicon.png?v=2",
  },
  openGraph: {
    type: "website",
    url: "https://focul.co",
    siteName: "Focul",
    title: "Focul — Close the loop on your work day",
    description:
      "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds — AI captures your next tasks before the context decays.",
    images: [
      {
        url: "/focul-logo-final.png",
        width: 1200,
        height: 630,
        alt: "Focul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Focul — Close the loop on your work day",
    description:
      "A 15-min focus timer for founders. When the bell rings, speak for 60 seconds — AI captures your next tasks before the context decays.",
    images: ["/focul-logo-final.png"],
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
