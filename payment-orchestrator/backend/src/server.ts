import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration to allow local development traffic
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Payment Orchestrator API' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  PAYMENT ORCHESTRATION SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});
