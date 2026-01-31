// Mock product data for demonstration purposes

import { z } from 'zod';
import { registry, createDataSource } from './registry.js';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  cost: number;
  stock: number;
  supplier: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  lastRestocked: string;
}

// Sample data pools
const categories = {
  Electronics: ['Laptops', 'Phones', 'Tablets', 'Accessories', 'Audio'],
  Furniture: ['Desks', 'Chairs', 'Storage', 'Lighting', 'Decor'],
  Office: ['Supplies', 'Paper', 'Writing', 'Organization', 'Tech'],
  Software: ['Productivity', 'Security', 'Design', 'Development', 'Communication'],
};

const productNames = {
  Laptops: ['ProBook 15', 'UltraSlim 14', 'WorkStation X', 'DevBook Pro', 'Budget Laptop'],
  Phones: ['SmartPhone Pro', 'Galaxy Plus', 'Business Phone', 'Budget Mobile', 'Secure Device'],
  Tablets: ['TabPro 12', 'Mini Tab 8', 'Drawing Tablet', 'Kids Tablet', 'Business Tab'],
  Accessories: ['USB Hub', 'Wireless Mouse', 'Keyboard Pro', 'Monitor Stand', 'Webcam HD'],
  Audio: ['Headphones Pro', 'Earbuds Wireless', 'Conference Speaker', 'Microphone USB', 'Soundbar'],
  Desks: ['Standing Desk', 'Executive Desk', 'Corner Desk', 'Simple Desk', 'Adjustable Desk'],
  Chairs: ['Ergonomic Chair', 'Executive Chair', 'Task Chair', 'Guest Chair', 'Stool'],
  Storage: ['Filing Cabinet', 'Bookshelf', 'Storage Box', 'Drawer Unit', 'Locker'],
  Lighting: ['Desk Lamp', 'Floor Lamp', 'LED Panel', 'Task Light', 'Ring Light'],
  Decor: ['Plant', 'Wall Art', 'Clock', 'Whiteboard', 'Cork Board'],
  Supplies: ['Stapler Set', 'Paper Clips', 'Tape Dispenser', 'Scissors', 'Ruler Set'],
  Paper: ['Copy Paper', 'Notebook', 'Sticky Notes', 'Index Cards', 'Labels'],
  Writing: ['Pen Set', 'Marker Pack', 'Highlighters', 'Pencils', 'Erasers'],
  Organization: ['Binder', 'Folder Pack', 'Desk Organizer', 'File Box', 'Label Maker'],
  Tech: ['Calculator', 'Power Strip', 'Extension Cord', 'Surge Protector', 'Battery Pack'],
  Productivity: ['Office Suite', 'Project Manager', 'Time Tracker', 'Note App', 'Calendar Pro'],
  Security: ['Antivirus Pro', 'VPN Service', 'Password Manager', 'Backup Solution', 'Firewall'],
  Design: ['Photo Editor', 'Vector Graphics', 'Video Editor', 'Audio Suite', '3D Modeler'],
  Development: ['IDE Pro', 'Database Tool', 'API Client', 'Version Control', 'Testing Suite'],
  Communication: ['Video Chat', 'Team Messenger', 'Email Client', 'Webinar Tool', 'Voice Chat'],
};

const suppliers = [
  'TechSupply Co', 'Global Distributors', 'Office Depot', 'Amazon Business', 'Staples',
  'CDW', 'Insight', 'SHI', 'Connection', 'PCM', 'Zones', 'Ingram Micro'
];

// Helper functions
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

// Generate products
function generateProducts(count: number): Product[] {
  const products: Product[] = [];
  const allCategories = Object.keys(categories);
  
  for (let i = 1; i <= count; i++) {
    const category = randomFrom(allCategories);
    const subcategories = categories[category as keyof typeof categories];
    const subcategory = randomFrom(subcategories);
    const names = productNames[subcategory as keyof typeof productNames] || ['Product'];
    const name = randomFrom(names);
    
    const price = Math.round((Math.random() * 500 + 10) * 100) / 100;
    const cost = Math.round(price * (0.4 + Math.random() * 0.3) * 100) / 100;
    const stock = Math.floor(Math.random() * 200);
    
    let status: Product['status'];
    if (stock === 0) status = 'OUT_OF_STOCK';
    else if (stock < 10) status = 'LOW_STOCK';
    else if (Math.random() < 0.05) status = 'DISCONTINUED';
    else status = 'IN_STOCK';
    
    products.push({
      id: `PRD-${String(i).padStart(4, '0')}`,
      sku: `${category.substring(0, 3).toUpperCase()}-${subcategory.substring(0, 3).toUpperCase()}-${String(i).padStart(4, '0')}`,
      name: `${name} ${Math.floor(Math.random() * 100)}`,
      category,
      subcategory,
      price,
      cost,
      stock,
      supplier: randomFrom(suppliers),
      status,
      lastRestocked: randomDate(60),
    });
  }
  
  return products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

// Generate 75 products
export const products: Product[] = generateProducts(75);

// Query function
export interface ProductQuery {
  name?: string;
  sku?: string;
  category?: string;
  subcategory?: string;
  supplier?: string;
  status?: Product['status'];
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
}

export function queryProducts(query: ProductQuery): Product[] {
  return products.filter(prod => {
    if (query.name && !prod.name.toLowerCase().includes(query.name.toLowerCase())) return false;
    if (query.sku && !prod.sku.toLowerCase().includes(query.sku.toLowerCase())) return false;
    if (query.category && prod.category !== query.category) return false;
    if (query.subcategory && prod.subcategory !== query.subcategory) return false;
    if (query.supplier && !prod.supplier.toLowerCase().includes(query.supplier.toLowerCase())) return false;
    if (query.status && prod.status !== query.status) return false;
    if (query.minPrice && prod.price < query.minPrice) return false;
    if (query.maxPrice && prod.price > query.maxPrice) return false;
    if (query.minStock && prod.stock < query.minStock) return false;
    if (query.maxStock && prod.stock > query.maxStock) return false;
    return true;
  });
}

// Statistics
export function getProductStats(data: Product[]) {
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySupplier: Record<string, number> = {};
  const valueByCategory: Record<string, number> = {};
  
  let totalValue = 0;
  let totalStock = 0;
  
  for (const prod of data) {
    const inventoryValue = prod.price * prod.stock;
    totalValue += inventoryValue;
    totalStock += prod.stock;
    
    byCategory[prod.category] = (byCategory[prod.category] || 0) + 1;
    byStatus[prod.status] = (byStatus[prod.status] || 0) + 1;
    bySupplier[prod.supplier] = (bySupplier[prod.supplier] || 0) + 1;
    valueByCategory[prod.category] = (valueByCategory[prod.category] || 0) + inventoryValue;
  }
  
  return {
    totalProducts: data.length,
    totalStock,
    totalValue: Math.round(totalValue * 100) / 100,
    byCategory,
    byStatus,
    bySupplier,
    valueByCategory: Object.entries(valueByCategory)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value),
  };
}

// Register with the registry
const productsDataSource = createDataSource<Product>({
  name: 'products',
  description: 'Product inventory with categories, pricing, stock levels, and supplier information',
  
  filterSchema: z.object({
    name: z.string().optional().describe('Filter by product name'),
    sku: z.string().optional().describe('Filter by SKU'),
    category: z.enum(['Electronics', 'Furniture', 'Office', 'Software']).optional(),
    subcategory: z.string().optional().describe('Filter by subcategory'),
    supplier: z.string().optional().describe('Filter by supplier'),
    status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
    minPrice: z.number().optional().describe('Minimum price'),
    maxPrice: z.number().optional().describe('Maximum price'),
    minStock: z.number().optional().describe('Minimum stock level'),
    maxStock: z.number().optional().describe('Maximum stock level'),
  }),
  
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price' },
    { key: 'stock', label: 'Stock' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'status', label: 'Status' },
  ],
  
  chartAggregations: [
    { key: 'byCategory', label: 'Products by Category', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'byStatus', label: 'Products by Status', xKey: 'name', yKey: 'count', recommendedType: 'pie' },
    { key: 'bySupplier', label: 'Products by Supplier', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'valueByCategory', label: 'Inventory Value by Category', xKey: 'name', yKey: 'value', recommendedType: 'bar' },
  ],
  
  query: (filters) => queryProducts(filters as ProductQuery),
  
  aggregate: (data, aggregationType) => {
    const stats = getProductStats(data);
    
    switch (aggregationType) {
      case 'byCategory':
        return Object.entries(stats.byCategory)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      case 'byStatus':
        return Object.entries(stats.byStatus)
          .map(([name, count]) => ({ name, count }));
      case 'bySupplier':
        return Object.entries(stats.bySupplier)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      case 'valueByCategory':
        return stats.valueByCategory;
      default:
        return [];
    }
  },
  
  getSummary: (data) => {
    const stats = getProductStats(data);
    return {
      totalProducts: stats.totalProducts,
      totalStock: stats.totalStock,
      totalValue: '$' + stats.totalValue.toLocaleString(),
      lowStockCount: stats.byStatus['LOW_STOCK'] || 0,
      outOfStockCount: stats.byStatus['OUT_OF_STOCK'] || 0,
    };
  },
});

registry.register(productsDataSource);
