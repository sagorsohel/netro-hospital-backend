import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "netro_hospital_jwt_super_secret_key_2026_secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// 1. User Login (Admin & Pharmacist)
export const login = async (req, res, next) => {
  try {
    // Body validated by loginSchema (email is trimmed & lowercased)
    const { email, password } = req.body;

    // Find user in Neon DB
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact administration.",
      });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT Token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Respond with sanitized user data
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchName: user.branchName,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. User Registration
export const register = async (req, res, next) => {
  try {
    // Body validated by registerSchema (email is trimmed & lowercased)
    const { name, email: normalizedEmail, password, role, branchName, phone } = req.body;

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email address already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;

    const newUser = {
      id: userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      branchName: branchName || "Main Hospital",
      phone: phone || null,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
      isActive: true,
    };

    await db.insert(users).values(newUser);

    // Generate token for auto login
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        branchName: newUser.branchName,
        phone: newUser.phone,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Authenticated User Profile
export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
};

// 4. Change Password
export const changePassword = async (req, res, next) => {
  try {
    // Body validated by changePasswordSchema
    const { currentPassword, newPassword } = req.body;

    // Get user with password from DB
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password does not match.",
      });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedNew, updatedAt: new Date() }).where(eq(users.id, req.user.id));

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};
