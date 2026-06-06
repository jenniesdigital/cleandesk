"use client";

import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({ children, size = "btn-lg", className }: { children: ReactNode; size?: string; className?: string }) {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button onClick={handleSignIn} className={`btn btn-primary ${size}${className ? " " + className : ""}`}>
      {children}
    </button>
  );
}
