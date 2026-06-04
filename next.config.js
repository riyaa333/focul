/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: '/landing-kinso-focul.html' },
      { source: '/dark', destination: '/landing-dark.html' },
    ]
  },
}

module.exports = nextConfig
