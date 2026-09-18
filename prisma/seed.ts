import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Elevate database...");

  const skills = await Promise.all([
    prisma.skill.upsert({ where: { name: "Communication" }, update: {}, create: { name: "Communication", category: "communication", description: "Expressing ideas clearly and listening actively." } }),
    prisma.skill.upsert({ where: { name: "Teamwork" }, update: {}, create: { name: "Teamwork", category: "teamwork", description: "Collaborating effectively with others." } }),
    prisma.skill.upsert({ where: { name: "Problem-solving" }, update: {}, create: { name: "Problem-solving", category: "problem-solving", description: "Diagnosing issues and finding solutions." } }),
    prisma.skill.upsert({ where: { name: "Adaptability" }, update: {}, create: { name: "Adaptability", category: "adaptability", description: "Adjusting to changing circumstances." } }),
    prisma.skill.upsert({ where: { name: "Time management" }, update: {}, create: { name: "Time management", category: "time-management", description: "Planning and prioritising tasks effectively." } }),
    prisma.skill.upsert({ where: { name: "Conflict resolution" }, update: {}, create: { name: "Conflict resolution", category: "conflict-resolution", description: "Resolving disagreements constructively." } }),
    prisma.skill.upsert({ where: { name: "Customer service" }, update: {}, create: { name: "Customer service", category: "customer-service", description: "Supporting clients professionally." } }),
  ]);

  const skillMap = Object.fromEntries(skills.map((s) => [s.name, s.id]));

  const pathways = await Promise.all([
    prisma.careerPathway.upsert({ where: { name: "Software Developer" }, update: {}, create: { name: "Software Developer", industry: "Technology", description: "Build and maintain software applications.", level: "entry", skills: ["Problem-solving", "Communication", "Teamwork"] } }),
    prisma.careerPathway.upsert({ where: { name: "Digital Marketing Assistant" }, update: {}, create: { name: "Digital Marketing Assistant", industry: "Marketing", description: "Support online campaigns and content.", level: "entry", skills: ["Communication", "Time management", "Adaptability"] } }),
    prisma.careerPathway.upsert({ where: { name: "Customer Service Representative" }, update: {}, create: { name: "Customer Service Representative", industry: "Customer Service", description: "Assist clients and resolve issues.", level: "entry", skills: ["Customer service", "Communication", "Conflict resolution"] } }),
  ]);

  const pathwayMap = Object.fromEntries(pathways.map((p) => [p.name, p.id]));
  console.log("Seeded skills:", skills.length, "pathways:", pathways.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
