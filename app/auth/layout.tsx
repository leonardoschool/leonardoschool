import type { Metadata } from "next";
import { colors } from "@/lib/theme/colors";

export const metadata: Metadata = {
  title: "Autenticazione | Leonardo School",
  description: "Login o registrati per accedere alla piattaforma",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${colors.background.authPage} py-6 px-4 sm:px-6 lg:px-8 ${colors.effects.transition}`}>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
