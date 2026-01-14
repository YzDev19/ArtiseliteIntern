import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany();
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: "Error fetching warehouses" });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body;
    const warehouse = await prisma.warehouse.create({
      data: { name, location }
    });
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ error: "Error creating warehouse" });
  }
};