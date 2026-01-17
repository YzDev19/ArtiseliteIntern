import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Basic metrics for active products and locations
    const totalProducts = await prisma.product.count({ where: { isArchived: false } });
    const totalWarehouses = await prisma.warehouse.count();
    
    // Calculate total stock units and overall asset valuation
    const allInventory = await prisma.inventory.findMany({ include: { product: true } });
    let totalStock = 0;
    let totalValue = 0;
    
    allInventory.forEach(item => {
      totalStock += item.quantity;
      totalValue += item.quantity * Number(item.product.price);
    });

    // Count products currently below their minimum stock thresholds
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      include: { inventory: true }
    });
    
    let lowStockCount = 0;
    products.forEach(p => {
      const current = p.inventory.reduce((sum, i) => sum + i.quantity, 0);
      if (current <= p.minStock) lowStockCount++;
    });

    // Retrieve latest system activity for the dashboard feed
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { name: true } } }
    });

    // Identify the top 5 most active products based on audit logs
    const mostActive = await prisma.auditLog.groupBy({
      by: ['entityId'],
      where: { entity: 'Product' },
      _count: { entityId: true },
      orderBy: { _count: { entityId: 'desc' } },
      take: 5
    });

    const topProducts = await Promise.all(mostActive.map(async (item) => {
      const product = await prisma.product.findUnique({ 
        where: { id: Number(item.entityId) },
        select: { name: true, sku: true } 
      });
      return {
        name: product?.name || 'Unknown Product',
        sku: product?.sku || 'N/A',
        count: item._count.entityId
      };
    }));

    // Aggregate total actions by type for chart visualization
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
    });

    const activityBreakdown = actionStats.map(a => ({
      action: a.action,
      count: a._count.action
    }));

    res.json({
      totalProducts,
      totalWarehouses,
      totalStock,
      totalValue: totalValue.toFixed(2),
      lowStockCount,
      recentActivity,
      topProducts,
      activityBreakdown
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};