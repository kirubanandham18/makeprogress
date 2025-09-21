import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Validate JWT secret at startup
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET environment variable must be at least 32 characters long for security");
}

const JWT_SECRET = process.env.SESSION_SECRET;

// Token blacklist for logout (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// Generate shorter-lived tokens for better security
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Blacklist token (for logout)
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  
  // Clean up expired tokens periodically (simple in-memory cleanup)
  // In production, use Redis with TTL or database with cleanup job
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
}

// Authentication middleware (pure JWT, no sessions)
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ message: "Authorization token required" });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  
  // Store user info and token in request for use in routes
  req.user = { id: decoded.userId };
  (req as any).token = token;
  next();
}

// Register user
export async function registerUser(email: string, password: string, firstName?: string, lastName?: string) {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists with this email");
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const user = await storage.createUser({
    email,
    passwordHash,
    firstName,
    lastName,
    emailVerified: false,
  });
  
  // Generate token
  const token = generateToken(user.id);
  
  return { user, token };
}

// Login user
export async function loginUser(email: string, password: string) {
  // Get user by email
  const user = await storage.getUserByEmail(email);
  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }
  
  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }
  
  // Generate token
  const token = generateToken(user.id);
  
  return { user, token };
}

// Setup authentication (pure JWT, no sessions)
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  // No session middleware needed for pure JWT authentication
}

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}