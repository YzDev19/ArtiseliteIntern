import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/inventory
export const getInventory = async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.query;

    if (!warehouseId) {
      return res.status(400).json({ error: "Warehouse ID is required" });
    }

    // Retrieve stock levels for a specific warehouse including product details
    const stock = await prisma.inventory.findMany({
      where: { warehouseId: Number(warehouseId) },
      include: { product: true } 
    });
    
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: "Error fetching inventory" });
  }
};

// POST /api/inventory
export const addStock = async (req: Request, res: Response) => {
  try {
    const { productId, warehouseId, quantity } = req.body;

    // Use upsert to either increase existing quantity or create a new record
    const inventory = await prisma.inventory.upsert({
      where: {
        productId_warehouseId: { 
          productId,
          warehouseId
        }
      },
      update: {
        quantity: { increment: quantity }
      },
      create: {
        productId,
        warehouseId,
        quantity
      }
    });

    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating stock" });
  }
};

// POST /api/inventory/transfer
export const transferStock = async (req: Request, res: Response) => {
  const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;

  if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const qty = Number(quantity);

  try {
    // Process movement within a transaction to ensure database consistency
    await prisma.$transaction(async (tx) => {
      
      // Verify source warehouse has enough units available
      const sourceStock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { 
            productId: Number(productId), 
            warehouseId: Number(fromWarehouseId) 
          }
        }
      });

      if (!sourceStock || sourceStock.quantity < qty) {
        throw new Error(`Insufficient stock in source warehouse. Available: ${sourceStock?.quantity || 0}`);
      }

      // Deduct quantity from the source location
      await tx.inventory.update({
        where: { id: sourceStock.id },
        data: { quantity: { decrement: qty } }
      });

      // Credit quantity to the destination location
      const targetStock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { 
            productId: Number(productId), 
            warehouseId: Number(toWarehouseId) 
          }
        }
      });

      if (targetStock) {
        await tx.inventory.update({
          where: { id: targetStock.id },
          data: { quantity: { increment: qty } }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: Number(productId),
            warehouseId: Number(toWarehouseId),
            quantity: qty
          }
        });
      }

      // Create an audit trail record for the transfer
      await tx.auditLog.create({
        data: {
          action: 'TRANSFER',
          entity: 'Inventory',
          entityId: productId,
          details: `Moved ${qty} units from WH #${fromWarehouseId} to WH #${toWarehouseId}`,
          userId: (req as any).user?.id || 1 
        }
      });
    });

    res.json({ message: "Transfer successful" });

  } catch (error: any) {
    console.error("Transfer failed:", error);
    res.status(400).json({ error: error.message || "Transfer failed" });
  }
};