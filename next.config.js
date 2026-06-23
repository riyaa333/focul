/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: '/landing-kinso-focul.html' },
      { source: '/dark', destination: '/landing-dark.html' },
      { source: '/brother', destination: '/brother.html' },
    ]
  },
}

module.exports = nextConfig
