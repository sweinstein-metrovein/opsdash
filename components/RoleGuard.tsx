"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Enforces role-based navigation restrictions.
 * - Admin   : no restrictions
 * - Regional: locked to their state; auto-redirects if at wrong URL
 * - Sister  : locked to their sister group; auto-redirects if at wrong URL
 *
 * Renders nothing — pure redirect logic only.
 */
export default function RoleGuard() {
  const { data: session, status } = useSession();
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    const role   = session.userRole;
    const state  = session.userState;
    const sister = session.userSister;

    const urlState  = searchParams.get("state");
    const urlSister = searchParams.get("sister");

    if (role === "regional" && state) {
      // Regional: must always be on their state
      if (urlState !== state || urlSister) {
        router.replace(`/dashboard?state=${state}`);
      }
    } else if (role === "sister" && sister !== undefined) {
      // Sister: must always be on their specific sister group
      const expectedSister = String(sister);
      if (urlSister !== expectedSister) {
        // Find state for this sister from session (stored in JWT)
        const stateParam = state ? `state=${state}&` : "";
        router.replace(`/dashboard?${stateParam}sister=${sister}`);
      }
    }
    // Admin: no restrictions
  }, [status, session, searchParams, router]);

  return null;
}
