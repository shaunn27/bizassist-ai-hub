import { mockChats, type ChatThread } from "./mockChats";
import { mockOrders, type Order } from "./mockOrders";
import { mockMeetings, type Meeting } from "./mockMeetings";
import { mockCustomers, type Customer } from "./mockCustomers";
import { mockProducts, type Product } from "./mockProducts";

import * as kedaiMaju from "./business/kedaiMaju";
import * as sitisBakehouse from "./business/sitisBakehouse";
import * as rajTech from "./business/rajTech";
import * as everPack from "./business/everPack";
import * as apexBuild from "./business/apexBuild";
import * as harborFoods from "./business/harborFoods";

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

export const BUSINESS_DATA: Record<string, BusinessSeed> = {
  "Kedai Maju Enterprise": {
    chats: kedaiMaju.chats as ChatThread[],
    orders: kedaiMaju.orders as Order[],
    meetings: kedaiMaju.meetings as Meeting[],
    customers: kedaiMaju.customers as Customer[],
    products: kedaiMaju.products as Product[],
  },
  "Siti's Bakehouse": {
    chats: sitisBakehouse.chats as ChatThread[],
    orders: sitisBakehouse.orders as Order[],
    meetings: sitisBakehouse.meetings as Meeting[],
    customers: sitisBakehouse.customers as Customer[],
    products: sitisBakehouse.products as Product[],
  },
  "RajTech Solutions": {
    chats: rajTech.chats as ChatThread[],
    orders: rajTech.orders as Order[],
    meetings: rajTech.meetings as Meeting[],
    customers: rajTech.customers as Customer[],
    products: rajTech.products as Product[],
  },
  "EverPack Materials Co.": {
    chats: everPack.chats as ChatThread[],
    orders: everPack.orders as Order[],
    meetings: everPack.meetings as Meeting[],
    customers: everPack.customers as Customer[],
    products: everPack.products as Product[],
  },
  "ApexBuild Supply Group": {
    chats: apexBuild.chats as ChatThread[],
    orders: apexBuild.orders as Order[],
    meetings: apexBuild.meetings as Meeting[],
    customers: apexBuild.customers as Customer[],
    products: apexBuild.products as Product[],
  },
  "HarborFoods Wholesale": {
    chats: harborFoods.chats as ChatThread[],
    orders: harborFoods.orders as Order[],
    meetings: harborFoods.meetings as Meeting[],
    customers: harborFoods.customers as Customer[],
    products: harborFoods.products as Product[],
  },
};
