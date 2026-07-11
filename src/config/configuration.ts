export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  google: {
    // Mismo Client ID se usa del lado del cliente (web/mobile) como
    // audience esperado al verificar el idToken — no es secreto.
    clientId: process.env.GOOGLE_CLIENT_ID,
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

  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:5174',

  payments: {
    provider: process.env.PAYMENT_PROVIDER ?? 'openpay',
  },

  orders: {
    cardTtlMinutes: parseInt(process.env.CARD_ORDER_TTL_MINUTES ?? '15', 10),
    transferTtlHours: parseInt(process.env.TRANSFER_ORDER_TTL_HOURS ?? '72', 10),
  },

  bankTransfer: {
    // Placeholder hasta tener los datos reales de Panda — reemplazar por env vars.
    bankName: process.env.BANK_TRANSFER_BANK_NAME ?? 'Banco Ejemplo',
    accountHolder: process.env.BANK_TRANSFER_HOLDER ?? 'Panda Estudios SRL',
    cbu: process.env.BANK_TRANSFER_CBU ?? '0000000000000000000000',
    alias: process.env.BANK_TRANSFER_ALIAS ?? 'PANDA.EVENTOS.INVS',
    cuit: process.env.BANK_TRANSFER_CUIT ?? '00-00000000-0',
  },

  // Openpay Argentina (BBVA) — docs.ecommercebbva.com
  openpay: {
    merchantId: process.env.OPENPAY_MERCHANT_ID,
    privateKey: process.env.OPENPAY_PRIVATE_KEY,
    publicKey: process.env.OPENPAY_PUBLIC_KEY, // tambien se expone al frontend (VITE_/EXPO_PUBLIC_)
    production: process.env.OPENPAY_PRODUCTION === 'true',
  },

  mail: {
    provider: process.env.MAIL_PROVIDER ?? 'smtp', // 'smtp' | 'console'
    fromEmail: process.env.FROM_EMAIL ?? 'no-reply@invs.app',
    fromName: process.env.FROM_NAME ?? 'INVS',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
});
