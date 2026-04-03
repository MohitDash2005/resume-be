const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Drop old non-sparse email index if it exists (migration for phone-support update)
    try {
      const usersCollection = conn.connection.collection("users");
      const indexes = await usersCollection.indexes();
      for (const idx of indexes) {
        // Drop old email_1 index that was NOT sparse (it blocks null emails)
        if (idx.name === "email_1" && !idx.sparse) {
          await usersCollection.dropIndex("email_1");
          console.log("✅ Dropped old non-sparse email index");
        }
      }
    } catch (e) {
      // Index may not exist — safe to ignore
    }
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
