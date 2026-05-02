import { mockChats, type ChatThread } from "./mockChats";
import { mockOrders, type Order } from "./mockOrders";
import { mockMeetings, type Meeting } from "./mockMeetings";
import { mockCustomers, type Customer } from "./mockCustomers";
import { mockProducts, type Product } from "./mockProducts";

type BusinessSeed = {
  chats: ChatThread[];
  orders: Order[];
  meetings: Meeting[];
  customers: Customer[];
  products: Product[];
};

export const BUSINESS_LIST: string[] = [
  "Kedai Maju Enterprise",
  "Siti's Bakehouse",
  "RajTech Solutions",
  "EverPack Materials Co.",
  "ApexBuild Supply Group",
  "HarborFoods Wholesale",
];

const empty = (): BusinessSeed => ({
  chats: [],
  orders: [],
  meetings: [],
  customers: [],
  products: [],
});

export const BUSINESS_DATA: Record<string, BusinessSeed> = {
  "Kedai Maju Enterprise": {
    chats: mockChats,
    orders: mockOrders,
    meetings: mockMeetings,
    customers: mockCustomers,
    products: mockProducts,
  },
  "Siti's Bakehouse": empty(),
  "RajTech Solutions": empty(),
  "EverPack Materials Co.": empty(),
  "ApexBuild Supply Group": empty(),
  "HarborFoods Wholesale": empty(),
};
