import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — non-blocking, no external request at runtime
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = {
  title: "EMAHU | Admin Control Center",
  description: "Central Administration Portal for EMAHU E-Commerce Platform",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#060710",
};

export default function RootLayout({ children }) {
  const interceptorScript = `
    (function() {
      if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
          if (typeof input === 'string') {
            const hostname = window.location.hostname;
            if (input.includes('127.0.0.1:5000') || input.includes('localhost:5000')) {
              if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                input = input
                  .replace('http://127.0.0.1:5000', '')
                  .replace('http://localhost:5000', '')
                  .replace('https://127.0.0.1:5000', '')
                  .replace('https://localhost:5000', '');
              }
            }
          }
          return originalFetch(input, init);
        };
        
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
          if (typeof url === 'string') {
            const hostname = window.location.hostname;
            if (url.includes('127.0.0.1:5000') || url.includes('localhost:5000')) {
              if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                url = url
                  .replace('http://127.0.0.1:5000', '')
                  .replace('http://localhost:5000', '')
                  .replace('https://127.0.0.1:5000', '')
                  .replace('https://localhost:5000', '');
              }
            }
          }
          return originalOpen.call(this, method, url, ...args);
        };
      }
    })();
  `;

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: interceptorScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
