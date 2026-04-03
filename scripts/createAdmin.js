require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME   = "ai_resume_analyzer";

const userSchema = new mongoose.Schema({
  name:         String,
  email:        { type: String, unique: true, lowercase: true },
  password:     String,
  avatar:       { type: String, default: "" },
  googleId:     { type: String, default: null },
  githubId:     { type: String, default: null },
  isAdmin:      { type: Boolean, default: false },
  refreshToken: String,
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(`${MONGO_URI}${DB_NAME}`);
    console.log("✅ Connected to MongoDB");

    const email    = "subham@gmail.com";
    const password = await bcrypt.hash("subham@2225", 12);

    const existing = await User.findOne({ email });

    if (existing) {
      existing.password = password;
      existing.isAdmin  = true;
      existing.name     = existing.name || "Subham";
      await existing.save();
      console.log("✅ Existing user updated to admin:", email);
    } else {
      await User.create({ name: "Subham", email, password, isAdmin: true });
      console.log("✅ Admin user created:", email);
    }

    console.log("\n🔐 Admin Credentials:");
    console.log("   Email   :", email);
    console.log("   Password: subham@2225");
    console.log("   isAdmin : true\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

createAdmin();
