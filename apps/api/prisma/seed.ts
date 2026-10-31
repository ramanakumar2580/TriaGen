/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// apps/api/prisma/seed.ts

import { PrismaClient, Role, Team } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Triagen Seeding...');

  // --- 1. Create Teams ---
  const teamNames = [
    'DevOps',
    'Backend Platform',
    'Frontend/UI',
    'SRE (Site Reliability)',
    'Security',
    'Customer Support',
  ];

  // 🛡️ Fix: Explicitly type the Map to store "Team" objects
  const teamsMap = new Map<string, Team>();

  for (const name of teamNames) {
    const team = await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    teamsMap.set(name, team);
    console.log(`✅ Team Ready: ${name}`);
  }

  // --- 2. Create Users for every Role ---
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Helper function to safely get team ID
  const getTeamId = (name: string) => {
    const team = teamsMap.get(name);
    if (!team) throw new Error(`Team ${name} not found during seeding`);
    return team.id;
  };

  // A. MASTER ADMIN (The "God Mode" user)
  await prisma.user.upsert({
    where: { email: 'admin@triagen.com' },
    update: {},
    create: {
      email: 'admin@triagen.com',
      name: 'Alice Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      teamId: getTeamId('DevOps'),
    },
  });
  console.log('👤 Created User: Alice Admin (admin@triagen.com)');

  // B. THE RESPONDER (The one fixing incidents)
  await prisma.user.upsert({
    where: { email: 'responder@triagen.com' },
    update: {},
    create: {
      email: 'responder@triagen.com',
      name: 'Bob Responder',
      password: hashedPassword,
      role: Role.RESPONDER,
      teamId: getTeamId('SRE (Site Reliability)'),
    },
  });
  console.log('👤 Created User: Bob Responder (responder@triagen.com)');

  // C. THE MEMBER (Standard employee reporting issues)
  await prisma.user.upsert({
    where: { email: 'member@triagen.com' },
    update: {},
    create: {
      email: 'member@triagen.com',
      name: 'Charlie Member',
      password: hashedPassword,
      role: Role.MEMBER,
      teamId: getTeamId('Frontend/UI'),
    },
  });
  console.log('👤 Created User: Charlie Member (member@triagen.com)');

  console.log('🚀 Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
