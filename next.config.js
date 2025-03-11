const hostnames = [
  "m.media-amazon.com",
  "lh3.googleusercontent.com",
  "firebasestorage.googleapis.com",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: hostnames.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
};
module.exports = nextConfig;
