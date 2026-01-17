import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Process incoming stock and update inventory levels
export const createInbound = async (req: Request, res: Response) => {
  const { warehouseId, reference, items } = req.body; 

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the inbound shipment record and its associated items
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

      // Increment stock levels or create new inventory records if they do not exist
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

// Process stock dispatches after verifying availability
export const createOutbound = async (req: Request, res: Response) => {
  const { warehouseId, reference, destination, items } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        // Validate that sufficient stock exists before deduction
        const stock = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } }
        });
        
        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for Product ID ${item.productId}`);
        }

        // Deduct the dispatched quantity from the specific warehouse
        await tx.inventory.update({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      // Record the outbound shipment details
      const outbound = await tx.outbound.create({
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

      return outbound;
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Outbound failed" });
  }
};