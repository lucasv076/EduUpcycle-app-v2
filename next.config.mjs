/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;

    // Webpack 5 behandelt .mjs-bestanden uit node_modules niet automatisch
    // als ES-modules — dit is vereist voor pdfjs-dist 4.x.
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;
