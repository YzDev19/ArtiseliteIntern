import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inbound stocks
export const createInbound = async (req: Request, res: Response) => {
  const { warehouseId, reference, items } = req.body; 
 

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Create inbound record
      const inbound = await tx.inbound.create({
        data: {
          warehouseId,
          reference,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          }
        },
        include: { items: true }
      });

      // B. Update inventory stock
      for (const item of items) {
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: { productId: item.productId, warehouseId }
          },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, warehouseId, quantity: item.quantity }
        });
      }

      return inbound;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Inbound transaction failed" });
  }
};

// 2. Outbound stock
export const createOutbound = async (req: Request, res: Response) => {
  const { warehouseId, reference, destination, items } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Check if stock available
      for (const item of items) {
        const stock = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } }
        });
        
        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for Product ID ${item.productId}`);
        }

        // B. Deduct stock
        await tx.inventory.update({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      // C. Create outbound record
      const outbound = await tx.outbound.create({
        data: {
          warehouseId,
          reference,
          destination,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          }
        },
        include: { items: true }
      });

      return outbound;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Outbound failed" });
  }
};