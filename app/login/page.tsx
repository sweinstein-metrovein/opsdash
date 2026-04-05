"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #001e36 0%, #002847 40%, #013462 70%, #002847 100%)",
      }}
    >
      {/* Background decorative circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: "absolute", top: "-15%", right: "-10%",
          width: "600px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,241,255,0.06) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", left: "-10%",
          width: "700px", height: "700px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2,132,199,0.07) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", top: "30%", left: "15%",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,241,255,0.04) 0%, transparent 70%)",
        }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,241,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,241,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Login card */}
      <div
        className="relative w-full max-w-[360px] mx-4 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.98)",
          boxShadow: "0 32px 72px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Card top accent */}
        <div
          className="absolute top-0 left-0 right-0 rounded-t-2xl"
          style={{ height: "3px", background: "linear-gradient(90deg, #002847 0%, #0284C7 50%, #d4f1ff 100%)" }}
        />

        <div className="px-9 pt-9 pb-8">
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <Image src="/mvc-logo.png" alt="Metro Vein Centers" width={190} height={34} priority />
          </div>

          {/* Tagline */}
          <div className="flex items-center justify-center gap-2 mb-8 mt-3">
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            <span
              className="font-semibold uppercase tracking-[0.2em]"
              style={{ fontSize: "9.5px", color: "#94a3b8", fontFamily: "var(--font-inter, Inter, sans-serif)" }}
            >
              Operations Dashboard
            </span>
            <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
          </div>

          {/* Error messages */}
          {error === "AccessDenied" && (
            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#b91c1c" }}>Access Denied</p>
              <p className="text-[12px]" style={{ color: "#dc2626" }}>
                Your account is not set up for access. Contact your administrator.
              </p>
            </div>
          )}

          {error && error !== "AccessDenied" && (
            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
            >
              <p className="text-[13px] font-semibold mb-0.5" style={{ color: "#92400e" }}>Sign-in Error</p>
              <p className="text-[12px]" style={{ color: "#b45309" }}>
                Something went wrong. Please try again or contact your administrator.
              </p>
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 text-[14px] font-semibold cursor-pointer"
            style={{
              background: "#E8756A",
              border: "none",
              borderRadius: "9999px",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(232,117,106,0.35), 0 1px 4px rgba(232,117,106,0.2)",
              transition: "all 200ms ease-out",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#D45F54";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(232,117,106,0.45), 0 2px 6px rgba(232,117,106,0.25)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#E8756A";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(232,117,106,0.35), 0 1px 4px rgba(232,117,106,0.2)";
              (e.currentTarget as HTMLElement).style.transform = "";
            }}
          >
            {/* Google logo — white version for coral background */}
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0, filter: "brightness(0) invert(1)", opacity: 0.9 }}>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer note */}
          <p className="text-center mt-5 text-[11px]" style={{ color: "#94a3b8" }}>
            Sign in with your{" "}
            <span className="font-semibold" style={{ color: "#64748b" }}>@metroveincenters.com</span>
            {" "}account
          </p>
        </div>
      </div>

      {/* Bottom version tag */}
      <div
        className="absolute bottom-5 text-center"
        style={{ fontSize: "10px", color: "rgba(212,241,255,0.2)", letterSpacing: "0.1em" }}
      >
        METRO VEIN CENTERS · INTERNAL USE ONLY
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
