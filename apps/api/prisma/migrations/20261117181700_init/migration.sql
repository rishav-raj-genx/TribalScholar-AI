-- CreateEnum
CREATE TYPE "Role" AS ENUM ('APPLICANT', 'SCRUTINY_OFFICER', 'SELECTION_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SchemeCode" AS ENUM ('NFST', 'NOS');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'DEFICIENT', 'RESUBMITTED', 'SCRUTINY_VERIFIED', 'SELECTION_PENDING', 'PROVISIONALLY_SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR_CARD', 'CASTE_CERTIFICATE', 'INCOME_CERTIFICATE', 'DOMICILE_CERTIFICATE', 'MARKSHEET_10TH', 'MARKSHEET_12TH', 'MARKSHEET_UG', 'MARKSHEET_PG', 'ADMISSION_OFFER_LETTER', 'BONAFIDE_CERTIFICATE', 'FEE_RECEIPT', 'BANK_PASSBOOK', 'SYNOPSIS_RESEARCH_PROPOSAL', 'JOINING_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FLAGGED_DEFICIENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "DeficiencyStatus" AS ENUM ('OPEN', 'RESOLVED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('RECOMMENDED_FOR_SELECTION', 'DEFICIENCY_FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostSelectionStatus" AS ENUM ('AWARD_LETTER_ISSUED', 'VISA_PENDING', 'JOINING_REPORT_SUBMITTED', 'DISBURSEMENT_ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_REGISTER', 'APPLICATION_CREATED', 'APPLICATION_UPDATED', 'APPLICATION_SUBMITTED', 'DOCUMENT_UPLOADED', 'OCR_PROCESSED', 'RULE_EVALUATED', 'DEFICIENCY_RAISED', 'DEFICIENCY_RESOLVED', 'OFFICER_REVIEW_SUBMITTED', 'SELECTION_DECISION_RECORDED', 'SCHEME_RULE_MODIFIED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'APPLICANT',
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "casteCommunity" TEXT NOT NULL,
    "subTribe" TEXT,
    "fatherOrSpouseName" TEXT NOT NULL,
    "annualIncome" DECIMAL(12,2) NOT NULL,
    "aadhaarNumberHash" TEXT,
    "addressLine" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "bankAccountNumberHash" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "code" "SchemeCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeVersion" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "incomeCeiling" DECIMAL(12,2) NOT NULL,
    "eligibilityRules" JSONB NOT NULL,
    "documentRequirements" JSONB NOT NULL,
    "scoringConfig" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "schemeVersionId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB NOT NULL,
    "meritScore" DOUBLE PRECISION,
    "ruleEvaluationResults" JSONB,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "ocrExtractedFields" JSONB,
    "ocrConfidence" DOUBLE PRECISION,
    "crossDocValidation" JSONB,
    "rejectionReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeficiencyRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentId" TEXT,
    "fieldOrCriteria" TEXT NOT NULL,
    "deficiencyCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DeficiencyStatus" NOT NULL DEFAULT 'OPEN',
    "raisedByOfficerId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeficiencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerReview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "remarks" TEXT NOT NULL,
    "checklistResults" JSONB NOT NULL,
    "aiFindingsAgreement" BOOLEAN NOT NULL DEFAULT true,
    "overrideReason" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSelectionRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "PostSelectionStatus" NOT NULL DEFAULT 'AWARD_LETTER_ISSUED',
    "awardLetterUrl" TEXT,
    "sanctionOrderNumber" TEXT,
    "sanctionedAmount" DECIMAL(12,2),
    "visaStatus" TEXT,
    "joiningReportSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "joiningDate" TIMESTAMP(3),
    "disbursementDetails" JSONB,
    "milestoneLogs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSelectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousState" TEXT,
    "newState" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantProfile_userId_key" ON "ApplicantProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantProfile_aadhaarNumberHash_key" ON "ApplicantProfile"("aadhaarNumberHash");

-- CreateIndex
CREATE INDEX "ApplicantProfile_state_district_idx" ON "ApplicantProfile"("state", "district");

-- CreateIndex
CREATE INDEX "ApplicantProfile_casteCommunity_idx" ON "ApplicantProfile"("casteCommunity");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_code_key" ON "Scheme"("code");

-- CreateIndex
CREATE INDEX "Scheme_code_idx" ON "Scheme"("code");

-- CreateIndex
CREATE INDEX "SchemeVersion_academicYear_idx" ON "SchemeVersion"("academicYear");

-- CreateIndex
CREATE INDEX "SchemeVersion_isPublished_idx" ON "SchemeVersion"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeVersion_schemeId_versionNumber_key" ON "SchemeVersion"("schemeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNumber_key" ON "Application"("applicationNumber");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_applicantId_idx" ON "Application"("applicantId");

-- CreateIndex
CREATE INDEX "Application_schemeId_schemeVersionId_idx" ON "Application"("schemeId", "schemeVersionId");

-- CreateIndex
CREATE INDEX "Application_submittedAt_idx" ON "Application"("submittedAt");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_documentType_idx" ON "ApplicationDocument"("applicationId", "documentType");

-- CreateIndex
CREATE INDEX "ApplicationDocument_verificationStatus_idx" ON "ApplicationDocument"("verificationStatus");

-- CreateIndex
CREATE INDEX "DeficiencyRecord_applicationId_status_idx" ON "DeficiencyRecord"("applicationId", "status");

-- CreateIndex
CREATE INDEX "DeficiencyRecord_raisedByOfficerId_idx" ON "DeficiencyRecord"("raisedByOfficerId");

-- CreateIndex
CREATE INDEX "OfficerReview_applicationId_idx" ON "OfficerReview"("applicationId");

-- CreateIndex
CREATE INDEX "OfficerReview_officerId_idx" ON "OfficerReview"("officerId");

-- CreateIndex
CREATE INDEX "OfficerReview_decision_idx" ON "OfficerReview"("decision");

-- CreateIndex
CREATE UNIQUE INDEX "PostSelectionRecord_applicationId_key" ON "PostSelectionRecord"("applicationId");

-- CreateIndex
CREATE INDEX "PostSelectionRecord_status_idx" ON "PostSelectionRecord"("status");

-- CreateIndex
CREATE INDEX "AuditLog_applicationId_idx" ON "AuditLog"("applicationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeVersion" ADD CONSTRAINT "SchemeVersion_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_schemeVersionId_fkey" FOREIGN KEY ("schemeVersionId") REFERENCES "SchemeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeficiencyRecord" ADD CONSTRAINT "DeficiencyRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeficiencyRecord" ADD CONSTRAINT "DeficiencyRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ApplicationDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeficiencyRecord" ADD CONSTRAINT "DeficiencyRecord_raisedByOfficerId_fkey" FOREIGN KEY ("raisedByOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerReview" ADD CONSTRAINT "OfficerReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerReview" ADD CONSTRAINT "OfficerReview_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSelectionRecord" ADD CONSTRAINT "PostSelectionRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
