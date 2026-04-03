import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    access_token?: string;
    userRole?: string;
    userState?: string;
    userSister?: number;
    userName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    userRole?: string;
    userState?: string;
    userSister?: number;
    userName?: string;
    roleLastFetched?: number; // Unix timestamp ms — role is re-fetched every 24h
  }
}
