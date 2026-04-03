import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { fetchUserAccess, ROLE_CACHE_MS } from "./user-roles";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],

  callbacks: {
    /**
     * Gate 1: domain check + BigQuery lookup.
     * If the email is not @metroveincenters.com OR not in the user_roles
     * table, login is rejected here before a session is ever created.
     */
    async signIn({ profile }) {
      if (!profile?.email?.endsWith("@metroveincenters.com")) return false;
      const access = await fetchUserAccess(profile.email);
      return access !== null;
    },

    /**
     * JWT is created on first login and refreshed on every request.
     * Role data is fetched from BigQuery:
     *   - always on first login (account is defined)
     *   - every 24 hours thereafter (roleLastFetched is stale)
     * This means staff changes in BigQuery take effect within 24 hours
     * without anyone needing to redeploy or edit any files.
     */
    async jwt({ token, account, profile }) {
      // Always store the Google Drive access token on first login
      if (account?.access_token) {
        token.access_token = account.access_token;
      }

      const email = (profile?.email ?? token.email) as string | undefined;
      const now   = Date.now();
      const isFirstLogin = !!account;
      const isStale      = !token.roleLastFetched || (now - token.roleLastFetched) > ROLE_CACHE_MS;

      // Fetch/refresh role from BigQuery when needed
      if (email && (isFirstLogin || isStale)) {
        const access = await fetchUserAccess(email);
        if (access) {
          token.userRole        = access.role;
          token.userState       = access.state;
          token.userSister      = access.sister;
          token.userName        = access.name;
          token.roleLastFetched = now;
        }
      }

      return token;
    },

    /** Expose role data to client components and API routes via session. */
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      session.access_token = token.access_token;
      session.userRole     = token.userRole;
      session.userState    = token.userState;
      session.userSister   = token.userSister;
      session.userName     = token.userName;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
