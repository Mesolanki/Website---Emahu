import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { DeliveryPricingService } from '../services/deliveryPricing';

const prisma = new PrismaClient();

export interface LocationData {
  country: string;
  state: string;
  zip: string;
}

export async function resolveLocationAndMethods(req: Request, res: Response, next: NextFunction) {
  try {
    const { country, state, zip } = req.body;

    if (!country) {
      return res.status(400).json({ error: 'Billing/Delivery country is required.' });
    }

    const normalizedCountry = country.trim().toUpperCase();
    const normalizedState = state ? state.trim().toUpperCase() : null;
    const normalizedZip = zip ? zip.trim().toUpperCase() : null;

    // Fetch all active payment method configurations
    const configs = await prisma.paymentMethodConfig.findMany({
      where: { isActive: true },
    });

    // Filter available payment methods based on location rules
    const availableMethods = configs.filter((config) => {
      const allowedCountries = config.allowedCountries.split(',').map((c) => c.trim().toUpperCase());
      
      // 1. Country Check
      if (!allowedCountries.includes(normalizedCountry)) {
        return false;
      }

      // 2. State Check (if specified in config)
      if (config.allowedStates && normalizedState) {
        const allowedStates = config.allowedStates.split(',').map((s) => s.trim().toUpperCase());
        if (!allowedStates.includes(normalizedState)) {
          return false;
        }
      }

      // 3. Zip code prefix or exact check (if specified in config)
      if (config.allowedZips && normalizedZip) {
        const allowedZips = config.allowedZips.split(',').map((z) => z.trim().toUpperCase());
        const matchesZip = allowedZips.some((pattern) => {
          if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return normalizedZip.startsWith(prefix);
          }
          return normalizedZip === pattern;
        });
        if (!matchesZip) {
          return false;
        }
      }

      return true;
    });

    // Calculate delivery pricing based on resolved location
    const pricing = DeliveryPricingService.calculateDeliveryFee(
      normalizedCountry,
      normalizedState,
      normalizedZip
    );

    // Store resolved info in request for use in controllers/routing
    req.body.resolvedLocation = {
      country: normalizedCountry,
      state: normalizedState,
      zip: normalizedZip,
    } as LocationData;

    req.body.availablePaymentMethods = availableMethods;
    req.body.deliveryPricing = pricing;
    next();
  } catch (error) {
    console.error('Location Resolver Middleware Error:', error);
    res.status(500).json({ error: 'Internal server error resolving location configurations.' });
  }
}
