/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Infraestructura en AWS con SST v3 (Ion).
 *
 * Provisiona:
 *  - Una VPC con NAT para que el sitio alcance la base de datos.
 *  - Aurora Serverless v2 (PostgreSQL) como base de datos.
 *  - El sitio Next.js (se despliega con Lambda + CloudFront vía OpenNext).
 *  - Secretos (AUTH_SECRET, Stripe, Google) inyectados como variables.
 *
 * Deploy (requiere credenciales de AWS configuradas):
 *   npx sst secret set AuthSecret "<valor>"     # y los demás secretos
 *   npx sst deploy --stage production
 *
 * En desarrollo local NO se usa esto: la app corre con `npm run dev`
 * contra el Postgres local (docker-compose o Homebrew).
 */
export default $config({
  app(input) {
    return {
      name: "escuelitas-fut",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage ?? ""),
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });

    const database = new sst.aws.Aurora("Database", {
      engine: "postgres",
      vpc,
      scaling: { min: "0 ACU", max: "4 ACU" },
    });

    // Secretos — configúralos con: npx sst secret set <Nombre> <valor>
    const authSecret = new sst.Secret("AuthSecret");
    const stripeSecretKey = new sst.Secret("StripeSecretKey");
    const stripeWebhookSecret = new sst.Secret("StripeWebhookSecret");
    const stripePublishableKey = new sst.Secret("StripePublishableKey");
    const googleClientId = new sst.Secret("GoogleClientId");
    const googleClientSecret = new sst.Secret("GoogleClientSecret");

    const databaseUrl = $interpolate`postgresql://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}`;

    new sst.aws.Nextjs("Web", {
      vpc,
      link: [database],
      environment: {
        DATABASE_URL: databaseUrl,
        AUTH_SECRET: authSecret.value,
        AUTH_TRUST_HOST: "true",
        STRIPE_SECRET_KEY: stripeSecretKey.value,
        STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.value,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishableKey.value,
        GOOGLE_CLIENT_ID: googleClientId.value,
        GOOGLE_CLIENT_SECRET: googleClientSecret.value,
      },
    });
  },
});
