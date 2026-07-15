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
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
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
