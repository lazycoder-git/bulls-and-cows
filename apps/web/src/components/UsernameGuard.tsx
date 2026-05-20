"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getMyUsername } from "@/lib/username";

/**
 * After Google sign-in, check if the user has picked a username.
 * If not, redirect to /auth/username.
 */
export default function UsernameGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router   = useRouter();
  const pathname = usePathname();

  // Don't guard auth pages themselves
  const isAuthPage = pathname?.startsWith("/auth/");

  useEffect(() => {
    if (status !== "authenticated" || isAuthPage) return;
    const existing = getMyUsername();
    if (!existing) {
      router.replace(`/auth/username?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
    }
  }, [status, isAuthPage, pathname, router]);

  return <>{children}</>;
}
