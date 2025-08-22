import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

// --- Item Schema ---
// We only need a minimal schema here for the query
const ItemSchema = new mongoose.Schema({
  name: { type: String },
  biddingStatus: { type: String, index: true },
  biddingEndDate: { type: Date },
  // ... other fields your bidding card might need
  category: { type: String },
  condition: { type: String },
  currentHighestBid: { type: Number },
});

const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

// --- Database Connection (re-usable) ---
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not defined.');
  return mongoose.connect(mongoUri);
}

// --- GET all items that are currently open for bidding ---
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Find items that are open for bidding and have not expired
    const biddableItems = await Item.find({ 
      biddingStatus: "open",
      biddingEndDate: { $gt: new Date() } // Check if the end date is in the future
    }).sort({ biddingEndDate: 1 }); // Sort by soonest to end

    return NextResponse.json(biddableItems, { status: 200 });
  } catch (error) {
    console.error('GET /api/items/biddable Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
