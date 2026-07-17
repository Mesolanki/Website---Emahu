import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/animations/animations.css";
import LenisProvider from "@/animations/LenisProvider";
import LoadingScreen from "@/animations/LoadingScreen";
import CustomAlertProvider from "@/components/CustomAlertProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EMAHU | Choose Your Experience",
  description: "The next generation e-commerce platform.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
                  .replace('127.0.0.1:5000', hostname + ':5000')
                  .replace('localhost:5000', hostname + ':5000');
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
                  .replace('127.0.0.1:5000', hostname + ':5000')
                  .replace('localhost:5000', hostname + ':5000');
              }
            }
          }
          return originalOpen.call(this, method, url, ...args);
        };
      }
    })();
  `;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: interceptorScript }} />
      </head>
      <body>
        <LenisProvider>
          <LoadingScreen />
          <CustomAlertProvider>
            <main>
              {children}
            </main>
          </CustomAlertProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
