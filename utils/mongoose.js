import mongoose from "mongoose";

// Fix mongoose warning for strictQuery (recommended for Mongoose 6 → 7)
mongoose.set("strictQuery", false);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/*
  Global caching ensures the database connection is reused
  across Next.js hot reloads and API route calls.
*/
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If connection is already established, return it
  if (cached.conn) return cached.conn;

  // Otherwise, create a new connection promise
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // You can add options if needed
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;

