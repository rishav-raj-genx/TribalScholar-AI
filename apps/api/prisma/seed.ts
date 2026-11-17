import { PrismaClient, Prisma } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { SEED_SCHEMES, SEED_USERS } from '../src/seed-data.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting TribalScholar AI database seeding...');

  // 1. Upsert Demo Users
  for (const user of SEED_USERS) {
    const passwordHash = await bcryptjs.hash(user.passwordPlainText, 10);

    const userRecord = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        isActive: true,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`👤 Upserted User: ${userRecord.email} [${userRecord.role}]`);

    // If applicant, upsert demographic profile
    if (user.profile) {
      await prisma.applicantProfile.upsert({
        where: { userId: userRecord.id },
        update: {
          dateOfBirth: new Date(user.profile.dateOfBirth),
          gender: user.profile.gender,
          casteCommunity: user.profile.casteCommunity,
          subTribe: user.profile.subTribe,
          fatherOrSpouseName: user.profile.fatherOrSpouseName,
          annualIncome: new Prisma.Decimal(user.profile.annualIncome),
          addressLine: user.profile.addressLine,
          district: user.profile.district,
          state: user.profile.state,
          pincode: user.profile.pincode,
          bankIfsc: user.profile.bankIfsc,
          bankName: user.profile.bankName,
        },
        create: {
          userId: userRecord.id,
          dateOfBirth: new Date(user.profile.dateOfBirth),
          gender: user.profile.gender,
          casteCommunity: user.profile.casteCommunity,
          subTribe: user.profile.subTribe,
          fatherOrSpouseName: user.profile.fatherOrSpouseName,
          annualIncome: new Prisma.Decimal(user.profile.annualIncome),
          addressLine: user.profile.addressLine,
          district: user.profile.district,
          state: user.profile.state,
          pincode: user.profile.pincode,
          bankIfsc: user.profile.bankIfsc,
          bankName: user.profile.bankName,
        },
      });

      console.log(`📄 Upserted Applicant Profile for: ${userRecord.email} (Income: ₹${user.profile.annualIncome})`);
    }
  }

  // 2. Upsert Master Schemes & Version 1 Rulesets
  for (const scheme of SEED_SCHEMES) {
    const schemeRecord = await prisma.scheme.upsert({
      where: { code: scheme.code },
      update: {
        name: scheme.name,
        description: scheme.description,
        isActive: true,
      },
      create: {
        code: scheme.code,
        name: scheme.name,
        description: scheme.description,
        isActive: true,
      },
    });

    console.log(`🏛️ Upserted Scheme: ${schemeRecord.code} (${schemeRecord.name})`);

    const versionRecord = await prisma.schemeVersion.upsert({
      where: {
        schemeId_versionNumber: {
          schemeId: schemeRecord.id,
          versionNumber: scheme.version.versionNumber,
        },
      },
      update: {
        academicYear: scheme.version.academicYear,
        totalSlots: scheme.version.totalSlots,
        incomeCeiling: new Prisma.Decimal(scheme.version.incomeCeiling),
        startDate: new Date(scheme.version.startDate),
        endDate: new Date(scheme.version.endDate),
        isPublished: scheme.version.isPublished,
        eligibilityRules: scheme.version.eligibilityRules as unknown as Prisma.InputJsonValue,
        documentRequirements: scheme.version.documentRequirements as unknown as Prisma.InputJsonValue,
        scoringConfig: scheme.version.crossDocumentConsistencyRules as unknown as Prisma.InputJsonValue,
      },
      create: {
        schemeId: schemeRecord.id,
        versionNumber: scheme.version.versionNumber,
        academicYear: scheme.version.academicYear,
        totalSlots: scheme.version.totalSlots,
        incomeCeiling: new Prisma.Decimal(scheme.version.incomeCeiling),
        startDate: new Date(scheme.version.startDate),
        endDate: new Date(scheme.version.endDate),
        isPublished: scheme.version.isPublished,
        eligibilityRules: scheme.version.eligibilityRules as unknown as Prisma.InputJsonValue,
        documentRequirements: scheme.version.documentRequirements as unknown as Prisma.InputJsonValue,
        scoringConfig: scheme.version.crossDocumentConsistencyRules as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(
      `📋 Upserted SchemeVersion v${versionRecord.versionNumber} for ${schemeRecord.code} [AY: ${versionRecord.academicYear}, Slots: ${versionRecord.totalSlots}, Income Ceiling: ₹${versionRecord.incomeCeiling}]`
    );
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
