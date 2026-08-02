/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Still ignored: the codebase has ~100 `react/no-unescaped-entities`
    // errors (Uzbek apostrophes in JSX text) plus unused imports. They are
    // cosmetic, so they belong in a dedicated cleanup pass rather than
    // blocking deploys. Run `pnpm --filter frontend lint` to see them.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors block the build again — the app type-checks clean today, and
    // silently shipping type errors is how broken code reaches production.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
