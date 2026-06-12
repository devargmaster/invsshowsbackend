export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET,
  },

  streaming: {
    provider: process.env.STREAMING_PROVIDER ?? 'mux', // 'mux' | 'youtube'
  },

  mux: {
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
    webhookSecret: process.env.MUX_WEBHOOK_SECRET,
    signedUrlTtl: parseInt(process.env.MUX_SIGNED_URL_TTL ?? '3600', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(','),
  },
});
