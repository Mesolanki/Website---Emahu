export interface DeliveryPriceResult {
  deliveryFee: number;
  currency: string;
}

export class DeliveryPricingService {
  /**
   * Dynamically calculates delivery fee based on shipping location.
   */
  public static calculateDeliveryFee(
    country: string,
    state: string | null,
    zip: string | null
  ): DeliveryPriceResult {
    const normalizedCountry = country.trim().toUpperCase();
    const normalizedState = state ? state.trim().toUpperCase() : '';
    const normalizedZip = zip ? zip.trim() : '';

    // Default Fallbacks
    let deliveryFee = 10.0;
    let currency = 'USD';

    switch (normalizedCountry) {
      case 'IN':
        currency = 'INR';
        deliveryFee = 100.0; // Base rate for India
        
        // State-specific discount/surcharge
        if (normalizedState === 'MH' || normalizedState === 'MAHARASHTRA') {
          deliveryFee = 60.0; // Local state delivery discount
        }
        
        // Zip-specific hyper-local delivery
        if (normalizedZip.startsWith('400')) {
          deliveryFee = 30.0; // Hyper-local Mumbai delivery rate
        }
        break;

      case 'US':
        currency = 'USD';
        deliveryFee = 15.0; // Base rate for US
        
        if (normalizedState === 'NY' || normalizedState === 'NEW YORK') {
          deliveryFee = 8.0; // East coast warehouse discount
        }
        break;

      case 'NL':
        currency = 'EUR';
        deliveryFee = 4.99; // Flat rate for Netherlands
        break;

      case 'GB':
        currency = 'GBP';
        deliveryFee = 3.99; // Flat rate for UK
        break;

      default:
        currency = 'USD';
        deliveryFee = 25.0; // International shipping flat rate
        break;
    }

    return { deliveryFee, currency };
  }
}
