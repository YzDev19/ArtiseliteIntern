import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fetch all warehouses including inventory data for stock 
export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventory: true 
      },
      orderBy: { id: 'asc' }
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
};

// Create a new warehouse location
export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body;
    const warehouse = await prisma.warehouse.create({
      data: { name, location }
    });
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ error: "Failed to create warehouse" });
  }
};

// Retrieve specific warehouse inventory with associated product details
export const getWarehouseInventory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: Number(id) },
      include: {
        inventory: {
          include: { product: true } 
        }
      }
    });

    if (!warehouse) return res.status(404).json({ error: "Warehouse not found" });

    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch warehouse details" });
  }
};