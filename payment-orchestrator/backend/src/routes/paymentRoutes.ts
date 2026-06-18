import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { resolveLocationAndMethods } from '../middleware/locationResolver';

const router = Router();

// Retrieve payment methods available for shipping/delivery location
router.post('/methods', resolveLocationAndMethods, PaymentController.getMethodsForLocation);

// Process dynamic routing and execute payment
router.post('/initiate', resolveLocationAndMethods, PaymentController.initiate);

// Dashboard routes for control operations
router.get('/registry', PaymentController.getRegistry);
router.post('/simulation', PaymentController.configureSimulation);
router.post('/reset', PaymentController.resetRegistry);

// Webhook status notification channel
router.post('/webhook', PaymentController.webhook);

export default router;
