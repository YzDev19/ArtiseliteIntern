import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fetch active products with total stock and location data
export const getProducts = async (req: Request, res: Response) => {
  const { search } = req.query;
  try {
    const products = await prisma.product.findMany({
      where: {
        isArchived: false,
        OR: search ? [
          { name: { contains: String(search), mode: 'insensitive' } },
          { sku: { contains: String(search), mode: 'insensitive' } },
          { category: { contains: String(search), mode: 'insensitive' } }
        ] : undefined
      },
      include: { inventory: { include: { warehouse: true } } },
      orderBy: { id: 'desc' }
    });

    const formatted = products.map(p => ({
      ...p,
      stockLevel: p.inventory.reduce((sum, item) => sum + item.quantity, 0)
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

// Create product, initialize stock, and log action
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, name, description, category, tags, price, stockLevel, minStock } = req.body;

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) return res.status(400).json({ error: "SKU exists" });

    const warehouse = await prisma.warehouse.upsert({
      where: { id: 1 },
      update: {},
      create: { name: "Main Warehouse", location: "HQ" }
    });

    const adminUser = await prisma.user.findFirst(); 

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku, name, 
          description: description || "",
          category: category || "General",
          tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
          price: price,
          costPrice: parseFloat(req.body.costPrice) || 0,
          minStock: parseInt(minStock) || 10,
        }
      });

      await tx.inventory.create({
        data: { productId: product.id, warehouseId: warehouse.id, quantity: parseInt(stockLevel) || 0 }
      });

      if (adminUser) {
        await tx.auditLog.create({
          data: {
            userId: adminUser.id,
            action: "PRODUCT_CREATE",
            entity: "Product",
            entityId: product.id,
            details: `Created ${sku}`
          }
        });
      }
      return product;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Create failed" });
  }
};

// Soft-delete product
export const archiveProduct = async (req: Request, res: Response) => {
  try {
     const { id } = req.params;

    await prisma.product.update({

      where: { id: parseInt(id as string) },

      data: { isArchived: true }

    });

    res.json({ message: "Product archived" });

  } catch (error) {

    res.status(500).json({ error: "Archive failed" });

  }

};

// Update product data and log changes
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { name, description, category, tags, price, minStock, costPrice} = req.body;



    const product = await prisma.product.update({

      where: { id: parseInt(id as string) },

      data: {

        name,

        description,

        category,

        tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : [],

        price: parseFloat(price),

        minStock: parseInt(minStock),

        costPrice: parseFloat(costPrice),

      }

    });

    await prisma.auditLog.create({
      data: { userId: 1, action: "PRODUCT_UPDATE", entity: "Product", entityId: product.id, details: `Updated ${product.sku}` }
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

// Bulk CSV import with validation
export const createBulkProducts = async (req: Request, res: Response) => {
  try {
    const products = req.body;
    const VALID_CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Automotive", "General"];
    const warehouse = await prisma.warehouse.upsert({ where: { id: 1 }, update: {}, create: { name: "Main", location: "HQ" } });
    const adminUser = await prisma.user.findFirst();
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const item of products) {
      try {
        await prisma.$transaction(async (tx) => {
          const matched = VALID_CATEGORIES.find(c => c.toLowerCase() === (item.category || "").trim().toLowerCase());
          const product = await tx.product.create({
            data: {
              sku: String(item.sku),
              name: String(item.name),
              category: matched || "General",
              price: parseFloat(item.price),
              costPrice: parseFloat(item.costPrice || 0),
              minStock: parseInt(item.minStock || 10),
              tags: item.tags ? String(item.tags).split(',').map((t: string) => t.trim()) : []
            }
          });

          await tx.inventory.create({ data: { productId: product.id, warehouseId: warehouse.id, quantity: parseInt(item.stockLevel || 0) } });

          if (adminUser) {
            await tx.auditLog.create({ data: { userId: adminUser.id, action: "BULK_IMPORT", entity: "Product", entityId: product.id, details: `Imported ${item.sku}` } });
          }
        });
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${item.sku}: Error`);
      }
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Bulk failed" });
  }
};