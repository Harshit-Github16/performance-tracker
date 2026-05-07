import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins"
});

export const metadata = {
  title: "Performance Tracker",
  description: "Advanced Sport-Agnostic Admin Panel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full antialiased ${poppins.variable}`}>
      <body className={`${poppins.className} min-h-full flex flex-col`}>
        <ErrorBoundary>
          <Toaster richColors position="top-right" />
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
