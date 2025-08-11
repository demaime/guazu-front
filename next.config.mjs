import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfigBase = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : "https://guazu2.vercel.app",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },
  reactStrictMode: true,
  transpilePackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "guazu2.vercel.app"],
    },
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js",
  swDest: "public/sw.js",
});

// Deshabilitar Service Worker en desarrollo: sólo habilitar en producción
const isProd = process.env.NODE_ENV === "production";
const nextConfig = isProd ? withSerwist(nextConfigBase) : nextConfigBase;

export default nextConfig;
