import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/animations/animations.css";
import LenisProvider from "@/animations/LenisProvider";
import LoadingScreen from "@/animations/LoadingScreen";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LenisProvider>
          <LoadingScreen />
          <main>
            {children}
          </main>
        </LenisProvider>
      </body>
    </html>
  );
}
