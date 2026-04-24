export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number; // -1 = unlimited
  category: "Food" | "Retail" | "Services";
  initial: string;
  color: string;
};

export const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Premium Chocolate Box",
    sku: "CHO-001",
    price: 15,
    stock: 45,
    category: "Food",
    initial: "C",
    color: "#7c2d12",
  },
  {
    id: "p2",
    name: "Vanilla Cream Box",
    sku: "VAN-002",
    price: 15,
    stock: 8,
    category: "Food",
    initial: "V",
    color: "#fde68a",
  },
  {
    id: "p3",
    name: "Strawberry Delight Box",
    sku: "STR-003",
    price: 18,
    stock: 0,
    category: "Food",
    initial: "S",
    color: "#dc2626",
  },
  {
    id: "p4",
    name: "Mixed Flavour Bundle",
    sku: "MIX-004",
    price: 55,
    stock: 22,
    category: "Food",
    initial: "M",
    color: "#f59e0b",
  },
  {
    id: "p5",
    name: "Corporate Gift Pack (10pcs)",
    sku: "GFT-005",
    price: 120,
    stock: 12,
    category: "Retail",
    initial: "G",
    color: "#2563eb",
  },
  {
    id: "p6",
    name: "Express Delivery Addon",
    sku: "SVC-006",
    price: 10,
    stock: -1,
    category: "Services",
    initial: "E",
    color: "#10b981",
  },
  {
    id: "p7",
    name: "Custom Packaging",
    sku: "PKG-007",
    price: 5,
    stock: 30,
    category: "Retail",
    initial: "P",
    color: "#8b5cf6",
  },
  {
    id: "p8",
    name: "Monthly Subscription Box",
    sku: "SUB-008",
    price: 200,
    stock: -1,
    category: "Services",
    initial: "M",
    color: "#ec4899",
  },
];
