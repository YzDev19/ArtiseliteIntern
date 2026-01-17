import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate financial valuation reports grouped by warehouse and category
export const getValuationReport = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true, warehouse: true }
    });

    const warehouseMap = new Map();
    const categoryMap = new Map();

    inventory.forEach(item => {
      const qty = item.quantity;
      const costValue = qty * (Number(item.product.costPrice) || 0); 
      const retailValue = qty * Number(item.product.price);          

      // Aggregate financial data by warehouse location
      const whName = item.warehouse.name;
      if (!warehouseMap.has(whName)) {
        warehouseMap.set(whName, { name: whName, totalCost: 0, totalRetail: 0, count: 0 });
      }
      const whEntry = warehouseMap.get(whName);
      whEntry.totalCost += costValue;
      whEntry.totalRetail += retailValue;
      whEntry.count += qty;

      // Aggregate financial data by product category
      const catName = item.product.category || 'Uncategorized';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, { name: catName, totalCost: 0, totalRetail: 0, count: 0 });
      }
      const catEntry = categoryMap.get(catName);
      catEntry.totalCost += costValue;
      catEntry.totalRetail += retailValue;
      catEntry.count += 1; 
    });

    res.json({ 
      byWarehouse: Array.from(warehouseMap.values()), 
      byCategory: Array.from(categoryMap.values()) 
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to generate report" });
  }
};