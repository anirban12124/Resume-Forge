import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata = {
  title: "ResumeForge - ATS-Optimized Resume Generator",
  description: "Create structured, ATS-optimized LaTeX resumes tailored to jobs using AI, GitHub repository logs, and internships.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground antialiased selection:bg-indigo-500/30">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
