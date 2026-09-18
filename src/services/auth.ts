import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { userRepo } from "../repositories";
import { prisma } from "../config/prisma";

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new Error("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepo.create({ email, passwordHash, displayName });
  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  return {
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  return {
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await userRepo.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export async function updateAccessibility(
  userId: string,
  data: {
    screenReader?: boolean;
    keyboardNavigation?: boolean;
    fontSize?: string;
    highContrast?: boolean;
    captions?: boolean;
    transcripts?: boolean;
    reducedMotion?: boolean;
    simpleLanguage?: boolean;
  }
) {
  return prisma.accessibilityPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function updateInterests(userId: string, interests: string[]) {
  return userRepo.updateInterests(userId, interests);
}

export async function updateGoals(userId: string, goals: string[]) {
  return userRepo.updateGoals(userId, goals);
}