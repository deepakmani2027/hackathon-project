import mongoose from 'mongoose';

// This file is the single source of truth for your shared data types.

// --- ENUMERATED TYPES ---
export type EwStatus = "Reported" | "Scheduled" | "Collected" | "Sorted" | "Processed" | "Recycled" | "Disposed";
export type BiddingStatus = "open" | "closed" | "draft";

// --- CORE DATA TYPES ---

export type EwItem = {
  _id: string;
  id: string;
  qrId: string;
  name: string;
  department: "Engineering" | "Sciences" | "Humanities" | "Administration" | "Hostel" | "Other";
  category: "Computer" | "Projector" | "Lab Equipment" | "Mobile Device" | "Battery" | "Accessory" | "Other";
  ageMonths: number;
  condition: "Good" | "Fair" | "Poor" | "Dead";
  notes?: string;
  status: EwStatus;
  createdAt: string;
  classification: { type: "Recyclable" | "Reusable" | "Hazardous"; notes?: string };
  createdBy: string;
  pickupId?: string;
  auditTrail?: Array<{ date: string; user: string; stage: string; status: string }>;
  disposalHistory?: Array<{ date: string; user: string; action: string }>;
  disposedAt?: string;
  disposedBy?: string;
  // --- New fields for the bidding system ---
  biddingStatus: BiddingStatus;
  startingBid: number;
  currentHighestBid: number;
  biddingEndDate: string; // ISO date string
  winningBidderId?: string;
}

export type Vendor = { 
  _id: string; 
  id: string; 
  name: string; 
  contact: string; 
  certified: boolean 
}

export type Pickup = {
  _id: string;
  id: string;
  date: string; // YYYY-MM-DD
  vendorId: string;
  itemIds: string[];
  notes?: string;
}

export type Bid = {
    _id: string;
    itemId: string;
    vendorId: string;
    bidAmount: number;
    createdAt: string;
}


// --- MONGOOSE SCHEMAS ---

const ClassificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["Recyclable", "Reusable", "Hazardous"], required: true },
  notes: { type: String, default: '' },
}, { _id: false });

export const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  department: { type: String, required: true },
  category: { type: String, required: true },
  ageMonths: { type: Number, required: true },
  condition: { type: String, required: true },
  notes: { type: String, trim: true },
  classification: { type: ClassificationSchema, required: true },
  status: { type: String, default: "Reported" },
  qrId: { type: String },
  createdBy: { type: String, required: true, index: true },
  pickupId: { type: String },
  auditTrail: { type: Array },
  disposalHistory: { type: Array },
  disposedAt: { type: String },
  disposedBy: { type: String },
  // --- New fields for the bidding system ---
  biddingStatus: { type: String, enum: ["open", "closed", "draft"], default: "draft" },
  startingBid: { type: Number, default: 0 },
  currentHighestBid: { type: Number, default: 0 },
  biddingEndDate: { type: Date },
  winningBidderId: { type: String },
}, { timestamps: true });

// This line is crucial for preventing model re-definition errors in Next.js
const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

export default Item;
