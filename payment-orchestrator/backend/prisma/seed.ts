import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.paymentMethodConfig.deleteMany({});
  await prisma.paymentGatewayRegistry.deleteMany({});
  await prisma.transaction.deleteMany({});

  console.log('Seeding payment configurations...');

  // Seed Payment Methods
  const paymentMethods = [
    {
      name: 'UPI (Unified Payments Interface)',
      type: 'UPI',
      allowedCountries: 'IN',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
    {
      name: 'RuPay Card',
      type: 'CARD',
      allowedCountries: 'IN',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
    {
      name: 'Credit/Debit Card (Global)',
      type: 'CARD',
      allowedCountries: 'US,NL,GB,IN,CA',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
    {
      name: 'Apple Pay',
      type: 'WALLET',
      allowedCountries: 'US,GB,CA',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
    {
      name: 'iDEAL (Netherlands Local)',
      type: 'NETBANKING',
      allowedCountries: 'NL',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
    {
      name: 'Klarna (BNPL)',
      type: 'BNPL',
      allowedCountries: 'NL,GB,US,DE',
      allowedStates: null,
      allowedZips: null,
      isActive: true,
    },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethodConfig.create({ data: pm });
  }

  // Seed Payment Gateways
  const gateways = [
    {
      name: 'Razorpay',
      supportedMethods: 'UPI,CARD,NETBANKING',
      supportedCountries: 'IN',
      priority: 100,
      processingFeePercent: 2.0,
      successRate: 0.95,
      healthStatus: 'HEALTHY',
      isActive: true,
    },
    {
      name: 'Stripe',
      supportedMethods: 'CARD,WALLET,BNPL',
      supportedCountries: 'US,NL,GB,IN,CA,DE',
      priority: 90,
      processingFeePercent: 2.9,
      successRate: 0.98,
      healthStatus: 'HEALTHY',
      isActive: true,
    },
    {
      name: 'Adyen',
      supportedMethods: 'CARD,NETBANKING,BNPL,WALLET',
      supportedCountries: 'US,NL,GB,IN,CA,DE',
      priority: 80,
      processingFeePercent: 2.5,
      successRate: 0.97,
      healthStatus: 'HEALTHY',
      isActive: true,
    },
  ];

  for (const gw of gateways) {
    await prisma.paymentGatewayRegistry.create({ data: gw });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
