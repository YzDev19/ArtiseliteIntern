import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import product_routes from '../routes/product_route';
import warehouse_routes from '../routes/warehouse_route';
import inventory_routes from '../routes/inventory_route';
import transaction_routes from '../routes/transaction_route'; 
import auth_routes from '../routes/auth_routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Routes
app.use('/api/products', product_routes);
app.use('/api/warehouses', warehouse_routes);
app.use('/api/inventory', inventory_routes);
app.use('/api/transactions', transaction_routes);
app.use('/api/auth', auth_routes);

// Health Check 
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handler 
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Shuttdown Prisma Client on process termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});