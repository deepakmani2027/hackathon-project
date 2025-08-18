import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

// --- User Schema and Model ---
// This defines the structure of the user document in MongoDB.
// We create a model only if it doesn't already exist to prevent errors during hot-reloading.
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true, // Ensures no two users can have the same email
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address.',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: 6,
  },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- MongoDB Connection ---
// This function establishes a connection to your MongoDB database.
// It's good practice to cache the connection to reuse it across requests.

// FIX: Explicitly type cachedDb to avoid the 'any' type error.
let cachedDb: typeof mongoose | null = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  try {
    // FIX: Check if the environment variable exists to prevent passing 'undefined' to connect.
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    const db = await mongoose.connect(mongoUri);
    console.log("Successfully connected to MongoDB.");
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw new Error("Could not connect to database.");
  }
}

// --- API Handler for POST requests ---
// In the App Router, we export a named function for each HTTP method.
// FIX: Use NextRequest for better type safety with the request object.
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get the request body
    const { name, email, password } = await request.json();

    // --- Input Validation ---
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields: name, email, or password.' }, { status: 400 });
    }

    // --- Check for Existing User ---
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
    }

    // --- Password Hashing ---
    const hashedPassword = await bcrypt.hash(password, 12);

    // --- Create and Save New User ---
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // --- Success Response ---
    return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });

  } catch (error) {
    console.error('Signup API Error:', error);
    // Send a generic error message to the client
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
