import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { ItemSchema } from "@/lib/types";

const Item = mongoose.models.Item || mongoose.model("Item", ItemSchema);

async function connect() {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not defined.");
  await mongoose.connect(mongoUri);
}

function normalizeId(id: unknown): string {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object") {
    const anyId = id as any;
    if (typeof anyId.toHexString === "function") return anyId.toHexString();
    if (anyId.buffer) {
      const bytes = Object.values(anyId.buffer) as number[];
      const hex = bytes.map((b) => Number(b).toString(16).padStart(2, "0")).join("");
      return hex || "";
    }
    if (typeof anyId.toString === "function") {
      const s = anyId.toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return String(id);
}

export async function POST(req: NextRequest) {
  try {
    await connect();
    const { itemId, vendorId, bidAmount } = await req.json();

    const vendorIdStr = normalizeId(vendorId);

    if (!itemId || !vendorIdStr || typeof bidAmount !== "number") {
      return NextResponse.json({ message: "Missing or invalid fields." }, { status: 400 });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    if (item.biddingStatus !== "open") {
      return NextResponse.json({ message: "Auction is not open." }, { status: 400 });
    }

    if (bidAmount <= (item.currentHighestBid || 0)) {
      return NextResponse.json({ message: "Bid must be higher than current highest bid." }, { status: 400 });
    }

    // Update highest bid + winner
    item.currentHighestBid = bidAmount;
    item.winningBidderId = vendorIdStr;
    await item.save();

    return NextResponse.json({ success: true, message: "Bid placed successfully." }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/bids Error:", e);
    return NextResponse.json({ message: e.message || "Server error." }, { status: 500 });
  }
}
