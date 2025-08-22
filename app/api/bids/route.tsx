import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

// --- Schemas ---
const BidSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  vendorId: { type: String, required: true },
  bidAmount: { type: Number, required: true },
}, { timestamps: true });

const ItemSchema = new mongoose.Schema({
    biddingStatus: { type: String },
    biddingEndDate: { type: Date },
    currentHighestBid: { type: Number },
    winningBidderId: { type: String },
});

const Bid = mongoose.models.Bid || mongoose.model('Bid', BidSchema);
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

// --- Database Connection ---
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not defined.');
  return mongoose.connect(mongoUri);
}

// --- POST: Place a new bid on an item ---
export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectToDatabase();
    const { itemId, vendorId, bidAmount } = await request.json();

    if (!itemId || !vendorId || !bidAmount) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const item = await Item.findById(itemId).session(session);

    if (!item) {
      throw new Error('Auction item not found.');
    }
    if (item.biddingStatus !== 'open') {
      throw new Error('This auction is no longer open for bidding.');
    }
    if (new Date() > new Date(item.biddingEndDate)) {
      throw new Error('This auction has already ended.');
    }
    if (bidAmount <= item.currentHighestBid) {
      throw new Error('Your bid must be higher than the current highest bid.');
    }

    const newBid = new Bid({ itemId, vendorId, bidAmount });
    await newBid.save({ session });

    item.currentHighestBid = bidAmount;
    item.winningBidderId = vendorId;
    await item.save({ session });

    await session.commitTransaction();

    return NextResponse.json({ message: 'Bid placed successfully!', newHighestBid: bidAmount }, { status: 201 });

  } catch (error) {
    await session.abortTransaction();
    console.error('POST /api/bids Error:', error);

    // --- FIX: Check the type of the error before accessing its properties ---
    let errorMessage = 'An internal server error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  } finally {
    session.endSession();
  }
}
