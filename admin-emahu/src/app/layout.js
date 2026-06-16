import "./globals.css";

export const metadata = {
  title: "EMAHU | Admin Panel",
  description: "Central Administration Portal for EMAHU E-Commerce Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
