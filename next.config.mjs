/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Başka sitenin Curate'i çerçeve içine alıp ücretli AI eylemine tıklatmasını engeller (Faz P1, B6).
  // Yalnız başlıklar; tam CSP kapsam dışı.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
