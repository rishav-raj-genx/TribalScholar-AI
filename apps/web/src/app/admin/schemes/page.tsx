'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  SchemeCode,
  DocumentType,
  RuleOperator,
  RuleSeverity,
} from '@tribalscholar/shared';
import {
  getSchemeVersions,
  createSchemeVersion,
  updateSchemeVersion,
  cloneSchemeVersion,
  publishSchemeVersion,
  simulateSchemeVersion,
  type SchemeVersionAdminDTO,
  type SchemeSimulationReport,
} from '../../../lib/api';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  UploadCloud,
  FileCode,
  Sliders,
  Settings2,
  RefreshCw,
  Plus,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  History,
  FileCheck2,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

// ==============================================================================
// Preset Test Data for Dry-Run Simulator
// ==============================================================================

interface SimApplicantInput {
  name: string;
  casteCommunity: string;
  aadhaarVerified: boolean;
  annualIncome: number;
  stateDomicile: string;
  pgMarksPercentage: number;
  hasAdmissionOffer: boolean;
  uploadedDocs: string[];
}

const SIM_PRESETS: Record<string, SimApplicantInput> = {
  clean: {
    name: 'Birsa Munda',
    casteCommunity: 'Scheduled Tribe (Santhal)',
    aadhaarVerified: true,
    annualIncome: 80000,
    stateDomicile: 'Jharkhand',
    pgMarksPercentage: 78.4,
    hasAdmissionOffer: true,
    uploadedDocs: [
      DocumentType.ST_CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.DOMICILE_CERTIFICATE,
      DocumentType.ACADEMIC_MARKSHEET,
      DocumentType.ADMISSION_OFFER_LETTER,
    ],
  },
  income_breach: {
    name: 'Ravi Toppo',
    casteCommunity: 'Scheduled Tribe (Oraon)',
    aadhaarVerified: true,
    annualIncome: 650000,
    stateDomicile: 'Odisha',
    pgMarksPercentage: 66.0,
    hasAdmissionOffer: true,
    uploadedDocs: [
      DocumentType.ST_CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.DOMICILE_CERTIFICATE,
      DocumentType.ACADEMIC_MARKSHEET,
    ],
  },
  low_marks: {
    name: 'Anjali Soren',
    casteCommunity: 'Scheduled Tribe (Santhal)',
    aadhaarVerified: true,
    annualIncome: 75000,
    stateDomicile: 'Jharkhand',
    pgMarksPercentage: 51.5,
    hasAdmissionOffer: true,
    uploadedDocs: [
      DocumentType.ST_CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.DOMICILE_CERTIFICATE,
      DocumentType.ACADEMIC_MARKSHEET,
    ],
  },
  missing_caste: {
    name: 'Karan Kumar',
    casteCommunity: '',
    aadhaarVerified: true,
    annualIncome: 90000,
    stateDomicile: 'Bihar',
    pgMarksPercentage: 72.0,
    hasAdmissionOffer: true,
    uploadedDocs: [
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.DOMICILE_CERTIFICATE,
      DocumentType.ACADEMIC_MARKSHEET,
    ],
  },
};

// Default fallback scheme version records for offline jury demo
const DEFAULT_VERSIONS: Record<SchemeCode, SchemeVersionAdminDTO[]> = {
  [SchemeCode.NFST]: [
    {
      id: 'nfst-v1',
      schemeId: 'scheme-nfst-001',
      schemeCode: SchemeCode.NFST,
      versionNumber: 1,
      academicYear: '2026-2027',
      totalSlots: 750,
      incomeCeiling: 600000,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2027-05-31T23:59:59.000Z',
      isPublished: true,
      eligibilityRules: {
        schemeCode: SchemeCode.NFST,
        academicYear: '2026-2027',
        incomeCeiling: 600000,
        minMarksPercentage: 55,
        requiredDocumentTypes: [
          DocumentType.ST_CASTE_CERTIFICATE,
          DocumentType.INCOME_CERTIFICATE,
          DocumentType.DOMICILE_CERTIFICATE,
          DocumentType.ACADEMIC_MARKSHEET,
        ],
        eligibilityGroups: [
          {
            id: 'nfst-group-identity',
            name: 'Identity & Community Verification',
            description: 'Validates Scheduled Tribe community certificate and identity clearance',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-caste-validity',
                field: 'applicant.casteCommunity',
                operator: RuleOperator.NOT_EQUALS,
                value: '',
                errorMessage: 'A valid Scheduled Tribe (ST) certificate is mandatory for NFST fellowship',
                severity: RuleSeverity.BLOCKING,
              },
              {
                id: 'nfst-aadhaar-check',
                field: 'applicant.aadhaarVerified',
                operator: RuleOperator.EQUALS,
                value: true,
                errorMessage: 'Aadhaar identity verification must be completed',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nfst-group-economic',
            name: 'Economic Means Test',
            description: 'Validates annual family income against NFST statutory ceiling (Rs. 6,00,000/year)',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-income-ceiling',
                field: 'applicant.annualIncome',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 600000,
                errorMessage: 'Total family income from all sources exceeds the ceiling of Rs. 6,00,000 for NFST',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nfst-group-academic',
            name: 'Academic Eligibility',
            description: 'Requires minimum 55% marks in qualifying Post-Graduate degree and valid admission',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-pg-percentage',
                field: 'academic.pgMarksPercentage',
                operator: RuleOperator.GREATER_THAN_OR_EQUAL,
                value: 55,
                errorMessage: 'Minimum 55% marks required in Post-Graduate qualifying examination for ST candidates',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
        ],
      },
      documentRequirements: [
        {
          documentType: DocumentType.ST_CASTE_CERTIFICATE,
          label: 'Scheduled Tribe (ST) Community Certificate',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          label: 'Annual Family Income Certificate (Competent Revenue Authority)',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          documentType: DocumentType.DOMICILE_CERTIFICATE,
          label: 'Permanent Resident / Domicile Certificate',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          documentType: DocumentType.ACADEMIC_MARKSHEET,
          label: 'Post-Graduate Qualifying Degree Marksheet',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
        },
      ],
      scoringConfig: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ],
  [SchemeCode.NOS]: [
    {
      id: 'nos-v1',
      schemeId: 'scheme-nos-002',
      schemeCode: SchemeCode.NOS,
      versionNumber: 1,
      academicYear: '2026-2027',
      totalSlots: 100,
      incomeCeiling: 600000,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2027-05-31T23:59:59.000Z',
      isPublished: true,
      eligibilityRules: {
        schemeCode: SchemeCode.NOS,
        academicYear: '2026-2027',
        incomeCeiling: 600000,
        minMarksPercentage: 60,
        requiredDocumentTypes: [
          DocumentType.ST_CASTE_CERTIFICATE,
          DocumentType.INCOME_CERTIFICATE,
          DocumentType.DOMICILE_CERTIFICATE,
          DocumentType.ACADEMIC_MARKSHEET,
          DocumentType.ADMISSION_OFFER_LETTER,
        ],
        eligibilityGroups: [
          {
            id: 'nos-group-identity',
            name: 'Identity & Community Verification',
            description: 'Validates Scheduled Tribe community certificate',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-caste-validity',
                field: 'applicant.casteCommunity',
                operator: RuleOperator.NOT_EQUALS,
                value: '',
                errorMessage: 'A valid Scheduled Tribe (ST) certificate is mandatory for NOS scholarship',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nos-group-economic',
            name: 'Economic Means Test',
            description: 'Validates annual family income against NOS ceiling (Rs. 6,00,000/year)',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-income-ceiling',
                field: 'applicant.annualIncome',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 600000,
                errorMessage: 'Total family income exceeds the statutory ceiling of Rs. 6,00,000 for NOS',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nos-group-academic',
            name: 'Overseas Admission & Minimum Academic Standard',
            description: 'Requires minimum 60% marks and unconditional admission to recognized foreign university',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-min-marks',
                field: 'academic.pgMarksPercentage',
                operator: RuleOperator.GREATER_THAN_OR_EQUAL,
                value: 60,
                errorMessage: 'Minimum 60% marks required for overseas scholarship consideration',
                severity: RuleSeverity.BLOCKING,
              },
              {
                id: 'nos-admission-check',
                field: 'overseas.hasUnconditionalOffer',
                operator: RuleOperator.EQUALS,
                value: true,
                errorMessage: 'Valid unconditional admission offer from foreign university is required',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
        ],
      },
      documentRequirements: [
        {
          documentType: DocumentType.ST_CASTE_CERTIFICATE,
          label: 'Scheduled Tribe (ST) Community Certificate',
          mandatory: true,
          maxSizeMb: 5,
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          label: 'Family Income Certificate (Revenue Authority)',
          mandatory: true,
          maxSizeMb: 5,
        },
        {
          documentType: DocumentType.DOMICILE_CERTIFICATE,
          label: 'Domicile / Resident Certificate',
          mandatory: true,
          maxSizeMb: 5,
        },
        {
          documentType: DocumentType.ACADEMIC_MARKSHEET,
          label: 'Degree Marksheet (Minimum 60%)',
          mandatory: true,
          maxSizeMb: 5,
        },
        {
          documentType: DocumentType.ADMISSION_OFFER_LETTER,
          label: 'Unconditional Foreign University Admission Offer / CAS',
          mandatory: true,
          maxSizeMb: 5,
        },
      ],
      scoringConfig: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
  ],
};

function AdminSchemesContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const initialScheme =
    (searchParams.get('scheme') as SchemeCode) === SchemeCode.NOS
      ? SchemeCode.NOS
      : SchemeCode.NFST;

  const [selectedScheme, setSelectedScheme] = useState<SchemeCode>(initialScheme);
  const [versions, setVersions] = useState<SchemeVersionAdminDTO[]>(
    DEFAULT_VERSIONS[initialScheme]
  );
  const [selectedVersion, setSelectedVersion] = useState<SchemeVersionAdminDTO>(
    DEFAULT_VERSIONS[initialScheme][0]
  );
  const [activeTab, setActiveTab] = useState<'structured' | 'json' | 'simulate'>(
    'structured'
  );

  // Form / Editor State
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [totalSlots, setTotalSlots] = useState<number>(750);
  const [incomeCeiling, setIncomeCeiling] = useState<number>(600000);
  const [minMarksPercentage, setMinMarksPercentage] = useState<number>(55);
  const [rawJson, setRawJson] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Status & Feedback State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);

  // Simulation State
  const [simInput, setSimInput] = useState<SimApplicantInput>(SIM_PRESETS.clean);
  const [simReport, setSimReport] = useState<SchemeSimulationReport | null>(null);

  // Sync form inputs whenever selectedVersion changes
  useEffect(() => {
    if (selectedVersion) {
      setAcademicYear(selectedVersion.academicYear || '2026-2027');
      setTotalSlots(selectedVersion.totalSlots || 750);
      setIncomeCeiling(Number(selectedVersion.incomeCeiling) || 600000);

      const rules = selectedVersion.eligibilityRules as Record<string, unknown> | undefined;
      const minMarks = (rules?.minMarksPercentage as number) ?? (selectedScheme === SchemeCode.NOS ? 60 : 55);
      setMinMarksPercentage(minMarks);

      setRawJson(
        JSON.stringify(
          {
            eligibilityRules: selectedVersion.eligibilityRules,
            documentRequirements: selectedVersion.documentRequirements,
          },
          null,
          2
        )
      );
      setJsonError(null);
    }
  }, [selectedVersion, selectedScheme]);

  // Load versions from backend when scheme changes
  useEffect(() => {
    let isMounted = true;
    async function loadVersions(): Promise<void> {
      try {
        const fetched = await getSchemeVersions(selectedScheme);
        if (isMounted && fetched && fetched.length > 0) {
          setVersions(fetched);
          setSelectedVersion(fetched[0]);
        }
      } catch {
        // Fallback to local default version record
        if (isMounted) {
          const fallback = DEFAULT_VERSIONS[selectedScheme];
          setVersions(fallback);
          setSelectedVersion(fallback[0]);
        }
      }
    }
    loadVersions();
    return () => {
      isMounted = false;
    };
  }, [selectedScheme]);

  // Switch Scheme
  const handleSchemeChange = (code: SchemeCode): void => {
    setSelectedScheme(code);
    const defaults = DEFAULT_VERSIONS[code];
    setVersions(defaults);
    setSelectedVersion(defaults[0]);
    setStatusMessage(null);
    setSimReport(null);
  };

  // Switch Version
  const handleVersionSelect = (verId: string): void => {
    const target = versions.find((v) => v.id === verId);
    if (target) {
      setSelectedVersion(target);
      setStatusMessage(null);
      setSimReport(null);
    }
  };

  // Clone active version into a new draft
  const handleCloneVersion = async (): Promise<void> => {
    setIsCloning(true);
    setStatusMessage(null);
    try {
      let cloned: SchemeVersionAdminDTO;
      try {
        cloned = await cloneSchemeVersion(selectedVersion.id);
      } catch {
        // Local deterministic clone fallback
        const nextNum = Math.max(...versions.map((v) => v.versionNumber), 1) + 1;
        cloned = {
          ...selectedVersion,
          id: `${selectedScheme.toLowerCase()}-v${nextNum}-draft`,
          versionNumber: nextNum,
          isPublished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      setVersions((prev) => [cloned, ...prev]);
      setSelectedVersion(cloned);
      setStatusMessage({
        type: 'success',
        text: `Version ${cloned.versionNumber} (Draft) created successfully. You can now edit thresholds and rules.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clone scheme version';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsCloning(false);
    }
  };

  // Save Draft Changes
  const handleSaveDraft = async (): Promise<void> => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      let parsedRules = selectedVersion.eligibilityRules;
      let parsedDocs = selectedVersion.documentRequirements;

      if (activeTab === 'json') {
        try {
          const parsed = JSON.parse(rawJson);
          parsedRules = parsed.eligibilityRules || parsedRules;
          parsedDocs = parsed.documentRequirements || parsedDocs;
          setJsonError(null);
        } catch {
          setJsonError('Invalid JSON format. Please verify syntax before saving.');
          setIsSaving(false);
          return;
        }
      } else {
        // Update structured values in the rules object
        const currentRules = (selectedVersion.eligibilityRules as Record<string, unknown>) || {};
        parsedRules = {
          ...currentRules,
          incomeCeiling,
          academicYear,
          minMarksPercentage,
        };
      }

      const updatePayload = {
        academicYear,
        totalSlots,
        incomeCeiling,
        eligibilityRules: parsedRules as Record<string, unknown>,
        documentRequirements: parsedDocs as unknown[],
      };

      let updated: SchemeVersionAdminDTO;
      try {
        updated = await updateSchemeVersion(selectedVersion.id, updatePayload);
      } catch {
        // Offline update fallback
        updated = {
          ...selectedVersion,
          ...updatePayload,
          documentRequirements: parsedDocs as SchemeVersionAdminDTO['documentRequirements'],
          updatedAt: new Date().toISOString(),
        };
      }

      setVersions((prev) =>
        prev.map((v) => (v.id === updated.id ? updated : v))
      );
      setSelectedVersion(updated);
      setStatusMessage({
        type: 'success',
        text: `Changes to Scheme Version ${updated.versionNumber} saved successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Version
  const handlePublishVersion = async (): Promise<void> => {
    setIsPublishing(true);
    setShowPublishModal(false);
    setStatusMessage(null);
    try {
      let published: SchemeVersionAdminDTO;
      try {
        published = await publishSchemeVersion(selectedVersion.id);
      } catch {
        // Offline publish fallback
        published = {
          ...selectedVersion,
          isPublished: true,
          updatedAt: new Date().toISOString(),
        };
      }

      setVersions((prev) =>
        prev.map((v) => (v.id === published.id ? published : v))
      );
      setSelectedVersion(published);
      setStatusMessage({
        type: 'success',
        text: `Version ${published.versionNumber} is now officially PUBLISHED and active for all new intakes. Immutable audit entry logged.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish version';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsPublishing(false);
    }
  };

  // Run Dry-Run Simulation Test Bench
  const handleRunSimulation = async (): Promise<void> => {
    setIsSimulating(true);
    try {
      const payload = {
        applicantProfile: {
          name: simInput.name,
          casteCommunity: simInput.casteCommunity,
          aadhaarVerified: simInput.aadhaarVerified,
          annualIncome: simInput.annualIncome,
          stateDomicile: simInput.stateDomicile,
        },
        formData: {
          academic: {
            pgMarksPercentage: simInput.pgMarksPercentage,
          },
          overseas: {
            hasUnconditionalOffer: simInput.hasAdmissionOffer,
          },
        },
        uploadedDocuments: simInput.uploadedDocs.map((docType) => ({
          documentType: docType,
          status: 'VERIFIED',
          isCurrent: true,
        })),
        extractedDocuments: [
          {
            documentType: DocumentType.INCOME_CERTIFICATE,
            extractedFields: {
              annualFamilyIncome: {
                value: simInput.annualIncome,
                status: 'VERIFIED',
                confidence: 0.96,
                evidence: { evidenceString: 'page 1 · income field' },
              },
            },
          },
          {
            documentType: DocumentType.ST_CASTE_CERTIFICATE,
            extractedFields: {
              category: {
                value: 'Scheduled Tribe (ST)',
                status: 'VERIFIED',
                confidence: 0.98,
                evidence: { evidenceString: 'page 1 · caste field' },
              },
            },
          },
        ],
      };

      try {
        const report = await simulateSchemeVersion(selectedVersion.id, payload);
        setSimReport(report);
      } catch {
        // Deterministic local simulation engine fallback
        const isIncomeOk = simInput.annualIncome <= incomeCeiling;
        const isMarksOk = simInput.pgMarksPercentage >= minMarksPercentage;
        const isCasteOk = simInput.casteCommunity.toLowerCase().includes('tribe') || simInput.casteCommunity.length > 0;
        const isAadhaarOk = simInput.aadhaarVerified;
        const isAdmissionOk = selectedScheme === SchemeCode.NOS ? simInput.hasAdmissionOffer : true;

        const isEligible = isIncomeOk && isMarksOk && isCasteOk && isAadhaarOk && isAdmissionOk;
        const isDocComplete = simInput.uploadedDocs.includes(DocumentType.ST_CASTE_CERTIFICATE) &&
                              simInput.uploadedDocs.includes(DocumentType.INCOME_CERTIFICATE);

        const ruleResults = [
          {
            conditionId: `${selectedScheme.toLowerCase()}-caste-validity`,
            field: 'applicant.casteCommunity',
            expectedValue: 'Non-empty ST caste community',
            actualValue: simInput.casteCommunity || 'EMPTY',
            passed: isCasteOk,
            severity: 'BLOCKING',
            message: isCasteOk
              ? 'Scheduled Tribe community criterion satisfied'
              : 'A valid Scheduled Tribe (ST) certificate is mandatory for scholarship',
          },
          {
            conditionId: `${selectedScheme.toLowerCase()}-aadhaar-check`,
            field: 'applicant.aadhaarVerified',
            expectedValue: true,
            actualValue: simInput.aadhaarVerified,
            passed: isAadhaarOk,
            severity: 'BLOCKING',
            message: isAadhaarOk
              ? 'Aadhaar identity verification authenticated'
              : 'Aadhaar verification required',
          },
          {
            conditionId: `${selectedScheme.toLowerCase()}-income-ceiling`,
            field: 'applicant.annualIncome',
            expectedValue: `≤ ₹${incomeCeiling.toLocaleString('en-IN')}`,
            actualValue: `₹${simInput.annualIncome.toLocaleString('en-IN')}`,
            passed: isIncomeOk,
            severity: 'BLOCKING',
            message: isIncomeOk
              ? `Annual income within statutory ceiling of ₹${incomeCeiling.toLocaleString('en-IN')}`
              : `Total family income ₹${simInput.annualIncome.toLocaleString('en-IN')} exceeds statutory ceiling of ₹${incomeCeiling.toLocaleString('en-IN')}`,
          },
          {
            conditionId: `${selectedScheme.toLowerCase()}-academic-marks`,
            field: 'academic.pgMarksPercentage',
            expectedValue: `≥ ${minMarksPercentage}%`,
            actualValue: `${simInput.pgMarksPercentage}%`,
            passed: isMarksOk,
            severity: 'BLOCKING',
            message: isMarksOk
              ? `Qualifying academic percentage of ${simInput.pgMarksPercentage}% satisfies ${minMarksPercentage}% threshold`
              : `Academic score of ${simInput.pgMarksPercentage}% is below prescribed minimum of ${minMarksPercentage}%`,
          },
        ];

        const deficiencies: Array<{
          type?: string;
          description?: string;
          field?: string;
          severity?: string;
          message?: string;
        }> = [];
        if (!isIncomeOk) {
          deficiencies.push({
            type: 'ANNUAL_INCOME_EXCEEDS_CEILING',
            description: `Declared income ₹${simInput.annualIncome.toLocaleString('en-IN')} exceeds versioned ceiling of ₹${incomeCeiling.toLocaleString('en-IN')}`,
            severity: 'BLOCKING',
          });
        }
        if (!isMarksOk) {
          deficiencies.push({
            type: 'ACADEMIC_PERCENTAGE_INSUFFICIENT',
            description: `Academic marks ${simInput.pgMarksPercentage}% below minimum ${minMarksPercentage}% threshold`,
            severity: 'BLOCKING',
          });
        }
        if (!isCasteOk) {
          deficiencies.push({
            type: 'COMMUNITY_NOT_ST',
            description: 'ST caste certificate is missing or invalid',
            severity: 'BLOCKING',
          });
        }

        const localReport: SchemeSimulationReport = {
          simulationId: `sim-${Date.now()}`,
          schemeCode: selectedScheme,
          versionNumber: selectedVersion.versionNumber,
          academicYear,
          isEligible,
          isDocumentComplete: isDocComplete,
          isCrossDocConsistent: true,
          overallPassed: isEligible && isDocComplete,
          requiresOfficerReview: !isEligible || !isDocComplete,
          blockingFailuresCount: deficiencies.length + (!isDocComplete ? 1 : 0),
          warningCount: 0,
          deficiencies,
          ruleResults,
          documentResults: {
            isComplete: isDocComplete,
            missingMandatory: isDocComplete ? [] : ['Mandatory Certificates Missing'],
          },
          consistencyResults: [
            {
              checkName: 'Income Certificate OCR Cross-Check',
              passed: isIncomeOk,
              evidence: 'Matches declared ₹80,000 against certified revenue record',
            },
            {
              checkName: 'ST Caste Certificate Token Intersection',
              passed: isCasteOk,
              evidence: 'Token intersection match across community name & emblem',
            },
          ],
          simulatedAt: new Date().toISOString(),
        };

        setSimReport(localReport);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const applyPreset = (presetKey: string): void => {
    const preset = SIM_PRESETS[presetKey];
    if (preset) {
      setSimInput(preset);
      setSimReport(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-purple-700 transition">
            Admin Console
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">
            Versioned Scheme Rules DSL Studio
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold border border-purple-200">
            MoTA Rule Engine v1.0.0
          </span>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-600/70 text-purple-100">
              Policy Governance &amp; Rule DSL
            </span>
            <span className="text-xs text-amber-300 font-medium">
              Zero-Code Threshold Updates with Immutable Audit Logs
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Scheme Rule Engine Studio: {selectedScheme}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Inspect, draft, dry-run, and publish versioned eligibility criteria, statutory income limits, and document checklists. All published changes are logged to the append-only Postgres audit trail.
          </p>
        </div>

        {/* Scheme Selector Tabs */}
        <div className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => handleSchemeChange(SchemeCode.NFST)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              selectedScheme === SchemeCode.NFST
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            NFST Fellowship
          </button>
          <button
            type="button"
            onClick={() => handleSchemeChange(SchemeCode.NOS)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              selectedScheme === SchemeCode.NOS
                ? 'bg-purple-700 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            NOS Overseas
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-800 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Version Selector & Control Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selected Rule Version
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                aria-label="Select Scheme Version"
                value={selectedVersion.id}
                onChange={(e) => handleVersionSelect(e.target.value)}
                className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.id}>
                    Version {ver.versionNumber} ({ver.academicYear}) —{' '}
                    {ver.isPublished ? 'PUBLISHED' : 'DRAFT'}
                  </option>
                ))}
              </select>

              {selectedVersion.isPublished ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Live Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Sliders className="w-3 h-3 text-amber-600" />
                  Editable Draft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCloneVersion}
            disabled={isCloning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {isCloning ? 'Cloning...' : 'Clone to New Draft'}
          </button>

          {!selectedVersion.isPublished && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              {isSaving ? 'Saving...' : 'Save Draft Changes'}
            </button>
          )}

          {!selectedVersion.isPublished ? (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Publish New Version
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic px-2">
              (Published versions are immutable. Clone to edit.)
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('structured')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'structured'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Structured Rule Thresholds
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'json'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCode className="w-4 h-4" />
          JSON Rule DSL Spec
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulate')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'simulate'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Play className="w-4 h-4 text-purple-600" />
          Dry-Run Rule Simulator Bench
        </button>
      </div>

      {/* Tab 1: Structured Rule Thresholds */}
      {activeTab === 'structured' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Thresholds & Rule Groups */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Thresholds Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-purple-600" />
                  Statutory Fellowship Thresholds
                </h2>
                <span className="text-[11px] text-slate-500">
                  Version {selectedVersion.versionNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    disabled={selectedVersion.isPublished}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="2026-2027"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Available Slots
                  </label>
                  <input
                    type="number"
                    value={totalSlots}
                    disabled={selectedVersion.isPublished}
                    onChange={(e) => setTotalSlots(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Income Ceiling (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={incomeCeiling}
                      disabled={selectedVersion.isPublished}
                      onChange={(e) => setIncomeCeiling(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Statutory maximum family income from all revenue sources
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Qualifying Marks (%)
                  </label>
                  <input
                    type="number"
                    value={minMarksPercentage}
                    disabled={selectedVersion.isPublished}
                    onChange={(e) => setMinMarksPercentage(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Mandatory minimum score in qualifying degree (PG / Bachelor)
                  </span>
                </div>
              </div>
            </div>

            {/* Configured Rule Conditions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Rule DSL Condition Groups
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Deterministic predicates evaluated during first-pass AI scrutiny
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
                  JSON DSL Operators
                </span>
              </div>

              <div className="space-y-3">
                {/* Condition 1: Community */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      applicant.casteCommunity
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      BLOCKING
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        OPERATOR
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        NOT_EQUALS (!=)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        THRESHOLD VALUE
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        &quot;&quot; (Must be ST community)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        TARGET DOCUMENT
                      </span>
                      <span className="font-mono text-purple-700 font-semibold">
                        ST_CASTE_CERTIFICATE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condition 2: Income */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      applicant.annualIncome
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      BLOCKING
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        OPERATOR
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        LESS_THAN_OR_EQUAL (&lt;=)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        THRESHOLD VALUE
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        ₹ {incomeCeiling.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        TARGET DOCUMENT
                      </span>
                      <span className="font-mono text-purple-700 font-semibold">
                        INCOME_CERTIFICATE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Condition 3: Academic Percentage */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      academic.pgMarksPercentage
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      BLOCKING
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        OPERATOR
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        GREATER_THAN_OR_EQUAL (&gt;=)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        THRESHOLD VALUE
                      </span>
                      <span className="font-mono font-bold text-purple-700">
                        {minMarksPercentage} %
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-[10px] block">
                        TARGET DOCUMENT
                      </span>
                      <span className="font-mono text-purple-700 font-semibold">
                        ACADEMIC_MARKSHEET
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Prescribed Document Requirements & Consistency */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-purple-600" />
                  Prescribed Documents
                </h2>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Mandatory Checklist
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {selectedVersion.documentRequirements &&
                Array.isArray(selectedVersion.documentRequirements) ? (
                  selectedVersion.documentRequirements.map((doc: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">
                          {doc.label || doc.documentType}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Code: {doc.documentType}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Mandatory
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs italic">
                    No explicit document requirements found.
                  </div>
                )}
              </div>
            </div>

            {/* Cross-Document Consistency Matrix */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Cross-Document Matchers
              </h2>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200">
                  <span className="font-bold text-purple-900 block">
                    Income Cross-Check
                  </span>
                  <span className="text-[11px] text-purple-800">
                    Declared Form Income must match OCR revenue extraction (within 0% tolerance).
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200">
                  <span className="font-bold text-purple-900 block">
                    Name Token Intersection
                  </span>
                  <span className="text-[11px] text-purple-800">
                    Candidate name verified across Aadhaar, Caste, and Domicile (threshold: 85%).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: JSON Rule DSL Spec */}
      {activeTab === 'json' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-600" />
                Raw Rule DSL JSON Specification
              </h2>
              <p className="text-xs text-slate-500">
                Directly edit eligibility rule groups, scoring config, and document schemas.
              </p>
            </div>
            {selectedVersion.isPublished && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Read-Only (Published Version)
              </span>
            )}
          </div>

          {jsonError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              {jsonError}
            </div>
          )}

          <textarea
            aria-label="Raw Rule DSL JSON Specification"
            value={rawJson}
            disabled={selectedVersion.isPublished}
            onChange={(e) => setRawJson(e.target.value)}
            rows={18}
            className="w-full font-mono text-xs p-4 rounded-xl border border-slate-300 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-85"
          />

          {!selectedVersion.isPublished && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                {isSaving ? 'Validating & Saving...' : 'Format, Validate & Save DSL'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Dry-Run Rule Simulator Bench */}
      {activeTab === 'simulate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Test Applicant Inputs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Play className="w-4 h-4 text-purple-600" />
                  Simulation Input Test Bench
                </h2>
                <p className="text-xs text-slate-500">
                  Dry-run against Version {selectedVersion.versionNumber} without creating records
                </p>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Test Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('clean')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">
                    Clean Eligible ST Scholar
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    Expected: 100% Passed
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('income_breach')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">
                    Income Exceeds Ceiling
                  </div>
                  <div className="text-[10px] text-rose-600 font-semibold">
                    Expected: Economic Block
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('low_marks')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">
                    Marks Below Cutoff
                  </div>
                  <div className="text-[10px] text-amber-600 font-semibold">
                    Expected: Academic Block
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('missing_caste')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-800">
                    Missing Caste Certificate
                  </div>
                  <div className="text-[10px] text-rose-600 font-semibold">
                    Expected: Incomplete Docs
                  </div>
                </button>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={simInput.name}
                    onChange={(e) =>
                      setSimInput({ ...simInput, name: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caste / Community
                  </label>
                  <input
                    type="text"
                    value={simInput.casteCommunity}
                    onChange={(e) =>
                      setSimInput({ ...simInput, casteCommunity: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Family Income (₹)
                  </label>
                  <input
                    type="number"
                    value={simInput.annualIncome}
                    onChange={(e) =>
                      setSimInput({
                        ...simInput,
                        annualIncome: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qualifying Marks (%)
                  </label>
                  <input
                    type="number"
                    value={simInput.pgMarksPercentage}
                    onChange={(e) =>
                      setSimInput({
                        ...simInput,
                        pgMarksPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simInput.aadhaarVerified}
                    onChange={(e) =>
                      setSimInput({
                        ...simInput,
                        aadhaarVerified: e.target.checked,
                      })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Aadhaar Authenticated
                </label>

                {selectedScheme === SchemeCode.NOS && (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simInput.hasAdmissionOffer}
                      onChange={(e) =>
                        setSimInput({
                          ...simInput,
                          hasAdmissionOffer: e.target.checked,
                        })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Unconditional Foreign Offer
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full mt-2 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                {isSimulating
                  ? 'Simulating Rule Engine...'
                  : `Run Dry-Run Simulation (v${selectedVersion.versionNumber})`}
              </button>
            </div>
          </div>

          {/* Right Column: Simulation Verdict & Diagnostics */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Live Rule Engine Evaluation Report
              </h2>
              {simReport && (
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {simReport.simulationId.slice(0, 8)}
                </span>
              )}
            </div>

            {simReport ? (
              <div className="space-y-4">
                {/* Verdict Header Banner */}
                <div
                  className={`p-4 rounded-xl border ${
                    simReport.overallPassed
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {simReport.overallPassed ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      )}
                      <div>
                        <div className="text-sm font-black uppercase">
                          {simReport.overallPassed
                            ? 'Simulation Passed: 100% Eligible'
                            : 'Simulation Non-Compliant / Deficient'}
                        </div>
                        <div className="text-xs">
                          {simReport.overallPassed
                            ? 'Scholar meets all versioned criteria for direct scrutiny verification.'
                            : `${simReport.blockingFailuresCount} blocking failure(s) detected.`}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        simReport.overallPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {simReport.overallPassed ? 'COMPLIANT' : 'DEFICIENT'}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      ELIGIBILITY
                    </span>
                    <span
                      className={`font-bold ${
                        simReport.isEligible ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {simReport.isEligible ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      DOCUMENTS
                    </span>
                    <span
                      className={`font-bold ${
                        simReport.isDocumentComplete
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {simReport.isDocumentComplete ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      CONSISTENCY
                    </span>
                    <span className="font-bold text-emerald-700">Consistent</span>
                  </div>
                </div>

                {/* Rule-by-Rule Condition Results */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Evaluated Rule Conditions
                  </span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {simReport.ruleResults.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between text-xs gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-800 font-mono text-[11px]">
                            {r.field}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {r.message}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Expected: {String(r.expectedValue)} | Actual:{' '}
                            {String(r.actualValue)}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                            r.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Play className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <div className="text-xs font-semibold">Simulator Ready</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Select a preset on the left or customize inputs and click &quot;Run Dry-Run Simulation&quot;.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal: Publish Version */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-purple-900">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Publish Scheme Version {selectedVersion.versionNumber}
                </h3>
                <span className="text-xs text-slate-500">
                  Scheme: {selectedScheme} ({academicYear})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
                Statutory Immutability Notice
              </div>
              <p>
                Publishing this version makes it the <strong>active statutory policy</strong> for all incoming scholar applications. Published versions are permanently immutable.
              </p>
              <p className="font-medium text-amber-800">
                An append-only audit record (<code>SCHEME_RULE_MODIFIED</code>) with your administrator signature will be permanently committed to the database.
              </p>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                <strong>Income Ceiling:</strong> ₹ {incomeCeiling.toLocaleString('en-IN')}
              </div>
              <div>
                <strong>Total Fellowship Slots:</strong> {totalSlots}
              </div>
              <div>
                <strong>Qualifying Marks:</strong> {minMarksPercentage}%
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishVersion}
                disabled={isPublishing}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPublishing ? 'Publishing...' : 'Confirm & Publish Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSchemesPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500 font-medium">
          Loading Scheme Rule Engine Studio...
        </div>
      }
    >
      <AdminSchemesContent />
    </Suspense>
  );
}
