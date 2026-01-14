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

    // if exist = update, if new = insert
    const inventory = await prisma.inventory.upsert({
      where: {
        productId_warehouseId: { //unique composite key
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