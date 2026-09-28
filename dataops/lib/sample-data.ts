import { mulberry32 } from "./utils";

export type Row = Record<string, any>;

export interface SampleDataset {
  id: string;
  name: string;
  file: string;
  description: string;
  domain: string;
  tags: string[];
  build: () => Row[];
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const weighted = <T,>(r: () => number, items: [T, number][]) => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    if ((x -= w) <= 0) return v;
  }
  return items[items.length - 1][0];
};
const dstr = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* 1. Quick-commerce orders (Blinkit-style case study)                 */
/* ------------------------------------------------------------------ */
function buildQuickCommerce(): Row[] {
  const r = mulberry32(2026);
  const cities: [string, number][] = [
    ["Ahmedabad", 22], ["Mumbai", 26], ["Bengaluru", 24], ["Delhi", 25], ["Pune", 14], ["Hyderabad", 16], ["Surat", 9], ["Jaipur", 7],
  ];
  const catalog: Record<string, [string, number][]> = {
    "Fruits & Vegetables": [["Banana (1 dozen)", 60], ["Onion (1 kg)", 45], ["Tomato (1 kg)", 38], ["Apple Shimla (4 pc)", 140]],
    "Dairy & Breakfast": [["Amul Milk 1L", 68], ["Paneer 200g", 95], ["Brown Bread", 50], ["Curd 400g", 45]],
    "Snacks & Munchies": [["Potato Chips", 20], ["Namkeen Mix 400g", 110], ["Chocolate Bar", 45], ["Cookies Pack", 35]],
    "Cold Drinks & Juices": [["Cola 750ml", 40], ["Mango Juice 1L", 99], ["Energy Drink", 125], ["Coconut Water", 55]],
    "Personal Care": [["Shampoo 340ml", 245], ["Face Wash", 199], ["Toothpaste", 110], ["Body Lotion", 299]],
    "Household Essentials": [["Detergent 1kg", 220], ["Dishwash Gel", 115], ["Floor Cleaner", 189], ["Garbage Bags", 99]],
    "Atta, Rice & Dal": [["Atta 5kg", 285], ["Basmati Rice 1kg", 160], ["Toor Dal 1kg", 175], ["Sugar 1kg", 48]],
  };
  const catWeights: [string, number][] = [
    ["Fruits & Vegetables", 22], ["Dairy & Breakfast", 24], ["Snacks & Munchies", 18], ["Cold Drinks & Juices", 12],
    ["Personal Care", 8], ["Household Essentials", 7], ["Atta, Rice & Dal", 9],
  ];
  const rows: Row[] = [];
  const start = new Date("2025-10-01T00:00:00Z").getTime();
  const days = 180;
  let id = 100000;
  for (let i = 0; i < 6000; i++) {
    const dayOffset = Math.floor(r() * days);
    const date = new Date(start + dayOffset * 86400000);
    const city = weighted(r, cities);
    const category = weighted(r, catWeights);
    const [product, basePrice] = pick(r, catalog[category]);
    const qty = 1 + Math.floor(r() * r() * 5);
    const discount = Math.round(weighted(r, [[0, 5], [0.05, 3], [0.1, 3], [0.15, 1.5], [0.2, 1]]) * 100) / 100;
    const weekend = [0, 6].includes(date.getUTCDay());
    // growth trend over time + weekend bump
    const trend = 1 + dayOffset / days / 3;
    let revenue = Math.round(basePrice * qty * (1 - discount) * trend * (weekend ? 1.12 : 1));
    let delivery = Math.round(8 + r() * 14 + (city === "Mumbai" || city === "Bengaluru" ? 3 : 0));
    let rating: number | null = Math.round((3 + r() * 2 - (delivery > 19 ? 0.8 : 0)) * 10) / 10;
    if (rating > 5) rating = 5;
    const customer_type = weighted(r, [["Returning", 62], ["New", 38]]);
    const payment = weighted(r, [["UPI", 64], ["Card", 16], ["Cash on Delivery", 12], ["Wallet", 8]]);

    // Injected data-quality issues so the Cleaner Agent has work to do
    if (r() < 0.035) rating = null;
    let cityOut: string | null = city;
    if (r() < 0.012) cityOut = null;
    if (r() < 0.01) cityOut = city.toUpperCase(); // inconsistent casing
    if (r() < 0.0015) revenue = revenue * 12; // outlier bulk order
    if (r() < 0.004) delivery = 55 + Math.floor(r() * 30); // outlier delay

    rows.push({
      order_id: `BK${id++}`,
      order_date: dstr(date),
      city: cityOut,
      category,
      product,
      quantity: qty,
      unit_price: basePrice,
      discount,
      revenue,
      delivery_minutes: delivery,
      rating,
      customer_type,
      payment_method: payment,
    });
  }
  // Story events for Anomaly Watch:
  //  • 26 Jan — Republic Day sale: revenue spike
  //  • 18–20 Feb — app outage: ~85% of orders lost
  let out = rows.filter((row) => !(row.order_date >= "2026-02-18" && row.order_date <= "2026-02-20" && r() < 0.85));
  out.forEach((row) => {
    if (row.order_date === "2026-01-26") row.revenue = Math.round(row.revenue * 3.2);
  });
  // exact duplicates (a classic pipeline bug)
  for (let i = 0; i < 24; i++) out.push({ ...out[Math.floor(r() * out.length)] });
  out.sort((a, b) => (a.order_date < b.order_date ? -1 : a.order_date > b.order_date ? 1 : 0));
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. Marketing campaigns                                              */
/* ------------------------------------------------------------------ */
function buildCampaigns(): Row[] {
  const r = mulberry32(77);
  const channels: [string, number, number][] = [
    // channel, CPC, conv rate
    ["Google Ads", 14, 0.041], ["Meta Ads", 9, 0.028], ["Instagram Influencer", 6, 0.019], ["Email", 0.6, 0.052], ["YouTube", 11, 0.017], ["WhatsApp", 0.9, 0.061],
  ];
  const campaigns = ["Diwali Dhamaka", "Monsoon Fresh", "Weekend Saver", "New User 50", "Midnight Munchies", "Republic Day Sale", "Summer Coolers", "Payday Bonanza"];
  const rows: Row[] = [];
  const start = new Date("2025-07-01T00:00:00Z").getTime();
  for (let i = 0; i < 420; i++) {
    const [channel, cpc, cr] = pick(r, channels);
    const campaign = pick(r, campaigns);
    const date = new Date(start + Math.floor(r() * 300) * 86400000);
    const impressions = Math.round(8000 + r() * 90000);
    const ctr = 0.008 + r() * 0.035;
    const clicks = Math.round(impressions * ctr);
    const spend = Math.round(clicks * cpc * (0.8 + r() * 0.4));
    const conversions = Math.round(clicks * cr * (0.7 + r() * 0.6));
    const aov = 280 + r() * 420;
    const revenue = Math.round(conversions * aov);
    rows.push({
      date: dstr(date),
      campaign,
      channel,
      region: pick(r, ["West", "North", "South", "East"]),
      impressions,
      clicks,
      spend,
      conversions,
      revenue,
      new_customers: Math.round(conversions * (0.3 + r() * 0.4)),
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

/* ------------------------------------------------------------------ */
/* 3. Used-car listings India                                          */
/* ------------------------------------------------------------------ */
function buildCars(): Row[] {
  const r = mulberry32(911);
  const models: [string, string, number, string][] = [
    ["Maruti Suzuki", "Swift", 7.2, "Hatchback"], ["Maruti Suzuki", "Baleno", 8.1, "Hatchback"], ["Hyundai", "Creta", 14.5, "SUV"],
    ["Hyundai", "i20", 8.9, "Hatchback"], ["Tata", "Nexon", 11.2, "SUV"], ["Tata", "Punch", 7.8, "SUV"], ["Mahindra", "XUV700", 21.5, "SUV"],
    ["Mahindra", "Thar", 15.9, "SUV"], ["Honda", "City", 13.4, "Sedan"], ["Toyota", "Innova Crysta", 22.8, "MUV"], ["Kia", "Seltos", 15.2, "SUV"],
    ["Toyota", "Fortuner", 38.5, "SUV"],
  ];
  const rows: Row[] = [];
  for (let i = 0; i < 900; i++) {
    const [brand, model, newPrice, body] = pick(r, models);
    const year = 2012 + Math.floor(r() * 13);
    const age = 2026 - year;
    const km = Math.round(age * (7000 + r() * 9000));
    const fuel = body === "SUV" || body === "MUV" ? weighted(r, [["Diesel", 55], ["Petrol", 35], ["CNG", 3], ["Electric", 7]]) : weighted(r, [["Petrol", 70], ["CNG", 20], ["Diesel", 10]]);
    const trans = weighted(r, [["Manual", 64], ["Automatic", 36]]);
    const owner = weighted(r, [["First", 62], ["Second", 28], ["Third", 8], ["Fourth & Above", 2]]);
    const depreciation = Math.pow(0.87, age) * (owner === "First" ? 1 : owner === "Second" ? 0.93 : 0.85) * (trans === "Automatic" ? 1.06 : 1);
    let price = Math.round(newPrice * depreciation * (0.9 + r() * 0.2) * 100) / 100;
    let kmOut: number | null = km;
    if (r() < 0.03) kmOut = null;
    if (r() < 0.005) price = price * 10;
    rows.push({
      listing_id: `CAR${5000 + i}`,
      brand,
      model,
      body_type: body,
      year,
      km_driven: kmOut,
      fuel,
      transmission: trans,
      owner,
      city: pick(r, ["Ahmedabad", "Mumbai", "Delhi", "Bengaluru", "Pune", "Chennai", "Kolkata", "Hyderabad"]),
      price_lakh: price,
    });
  }
  return rows;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: "quick-commerce",
    name: "Quick-Commerce Orders",
    file: "quick_commerce_orders.csv",
    description: "6,000 grocery delivery orders across 8 Indian cities — revenue, discounts, delivery time and ratings. Includes real-world mess: missing values, duplicates and outliers.",
    domain: "Retail / Q-Commerce",
    tags: ["Sales", "Operations", "Customer"],
    build: buildQuickCommerce,
  },
  {
    id: "marketing-campaigns",
    name: "Marketing Campaigns",
    file: "marketing_campaigns.csv",
    description: "420 campaign-day records across 6 channels with spend, clicks, conversions and revenue — perfect for ROAS, CAC and funnel analysis.",
    domain: "Marketing",
    tags: ["ROAS", "CAC", "Funnel"],
    build: buildCampaigns,
  },
  {
    id: "used-cars-india",
    name: "Used Cars India",
    file: "used_cars_india.csv",
    description: "900 used-car listings — brand, model, year, km driven, fuel, transmission, ownership and price in lakh.",
    domain: "Automotive",
    tags: ["Pricing", "Regression", "Market"],
    build: buildCars,
  },
];

const cache: Record<string, Row[]> = {};
export function getSample(id: string): Row[] {
  if (!cache[id]) {
    const ds = SAMPLE_DATASETS.find((d) => d.id === id);
    cache[id] = ds ? ds.build() : [];
  }
  return cache[id];
}
