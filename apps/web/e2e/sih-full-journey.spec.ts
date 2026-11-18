import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function getAssetPath(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'demo-assets', filename),
    path.resolve(process.cwd(), '../../demo-assets', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), 'demo-assets', filename);
}

test.describe('SIH 2026 End-to-End Demonstration Journey (11 Mandatory Steps)', () => {
  // Test file asset paths generated in Prompt 8.1
  const casteCertPath = getAssetPath('st_caste_certificate_valid.png');
  const deficientIncomeCertPath = getAssetPath('income_certificate_deficient.png');
  const validIncomeCertPath = getAssetPath('income_certificate_valid.png');
  const domicileCertPath = getAssetPath('domicile_certificate_valid.png');
  const marksheetCertPath = getAssetPath('academic_marksheet_valid.png');

  test('executes and asserts the complete 11-step scholarship scrutiny and award journey', async ({ page }) => {
    test.setTimeout(360000); // 6 minutes for complete full-stack AI execution with PaddleOCR

    // -------------------------------------------------------------------------
    // Step 0: Ensure Pristine Baseline via Demo Reset
    // -------------------------------------------------------------------------
    const resetRes = await page.request.post('http://localhost:4000/api/v1/demo/reset');
    expect(resetRes.ok()).toBeTruthy();
    const resetData = await resetRes.json();
    expect(resetData.status).toBe('success');

    // -------------------------------------------------------------------------
    // Step 1: Applicant Registration
    // -------------------------------------------------------------------------
    const scholarEmail = `scholar.journey.${Date.now()}@demo.in`;
    const scholarPassword = 'Password@123';
    const scholarName = 'Sample Applicant';

    await page.goto('/register');
    await expect(page.locator('#fullName')).toBeVisible();

    await page.locator('#fullName').fill(scholarName);
    await page.locator('#email').fill(scholarEmail);
    await page.locator('#phone').fill('+919876543210');
    await page.locator('#password').fill(scholarPassword);
    await page.locator('#role').selectOption('APPLICANT');

    await page.locator('button[type="submit"]').click();

    // Verify successful registration and dashboard landing
    await expect(page).toHaveURL(/.*\/applicant/);
    await expect(page.locator('h1:has-text("Welcome, Sample Applicant")')).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Scheme Application Intake (NFST)
    // -------------------------------------------------------------------------
    await page.goto('/applicant/apply/NFST');
    await expect(
      page.locator('h1:has-text("National Fellowship for Higher Education of ST Students (NFST)")')
    ).toBeVisible();

    // Verify Step 1 demographic form
    await expect(
      page.locator('text=Step 1: Scholar Information & Fellowship Details')
    ).toBeVisible();
    await page.locator('button:has-text("Continue to Document Uploads")').click();

    // -------------------------------------------------------------------------
    // Step 3: Document Upload with Deficient Income Certificate
    // -------------------------------------------------------------------------
    await expect(page.locator('text=Step 2: Prescribed Certificate Ingestion')).toBeVisible();

    // Locate the 4 prescribed document file inputs:
    // Slot 0: ST Caste Certificate (valid)
    // Slot 1: Annual Family Income Certificate (DEFICIENT: ₹1,20,000 on cert vs ₹80,000 declared)
    // Slot 2: State Domicile Certificate (valid)
    // Slot 3: Academic Marksheet (valid)
    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs).toHaveCount(4);

    await fileInputs.nth(0).setInputFiles(casteCertPath);
    await fileInputs.nth(1).setInputFiles(deficientIncomeCertPath);
    await fileInputs.nth(2).setInputFiles(domicileCertPath);
    await fileInputs.nth(3).setInputFiles(marksheetCertPath);

    // Verify all 4 documents are visibly attached in the UI
    await expect(page.locator('text=Attached: st_caste_certificate_valid.png')).toBeVisible();
    await expect(page.locator('text=Attached: income_certificate_deficient.png')).toBeVisible();
    await expect(page.locator('text=Attached: domicile_certificate_valid.png')).toBeVisible();
    await expect(page.locator('text=Attached: academic_marksheet_valid.png')).toBeVisible();

    await page.locator('button:has-text("Review & Proceed to Scrutiny")').click();

    // -------------------------------------------------------------------------
    // Steps 4 & 5: PaddleOCR Processing & Automated Rule Engine Evaluation
    // -------------------------------------------------------------------------
    await expect(page.locator('text=Step 3: Final Review & Trigger AI Scrutiny')).toBeVisible();

    // Trigger AI Scrutiny pipeline
    const submitBtn = page.locator('button:has-text("Submit Application for AI Scrutiny")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Assert that the OCR execution pipeline runs and completes
    await expect(page.locator('text=Pipeline Execution Completed')).toBeVisible({ timeout: 180000 });
    await expect(page.locator('text=Application Submitted & Evaluated')).toBeVisible();

    // Extract generated application number
    const appNumLocator = page.locator('strong.text-amber-300');
    await expect(appNumLocator).toBeVisible();
    const generatedAppNum = (await appNumLocator.textContent())?.trim() || '';
    expect(generatedAppNum).toMatch(/^TS-NFST-2026-\d+/);

    // -------------------------------------------------------------------------
    // Step 6: Deficiency Detection (DEFICIENCY_RAISED)
    // -------------------------------------------------------------------------
    await page.locator('text=Return to Scholar Dashboard').click();
    await expect(page).toHaveURL(/.*\/applicant\/dashboard/);

    // Locate the newly generated application card on dashboard
    await expect(page.locator(`text=${generatedAppNum}`)).toBeVisible();

    // Verify deficiency status badge on dashboard (rendered as ACTION REQUIRED)
    await expect(page.locator('span:has-text("ACTION REQUIRED")').first()).toBeVisible();

    // Open application detail view
    await page.goto(`/applicant/applications/${generatedAppNum}`);
    await expect(page.locator('h1')).toContainText(generatedAppNum);

    // Verify Actionable Deficiency UI elements
    await expect(page.locator('text=ACTION REQUIRED: DEFICIENCY RAISED')).toBeVisible();
    await expect(page.locator('text=Actionable Deficiency Resolution Desk')).toBeVisible();
    await expect(page.locator('text=OPEN ACTION ITEM').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 7: Applicant Correction (Uploads valid ₹80,000 Income Certificate)
    // -------------------------------------------------------------------------
    // Attach replacement document in the deficiency resolution card
    const replacementInput = page.locator('section input[type="file"]').first();
    await replacementInput.setInputFiles(validIncomeCertPath);
    await expect(page.locator('text=Selected: income_certificate_valid.png')).toBeVisible();

    // Fill resolution note explaining correction
    const resolutionNoteTextarea = page.locator('textarea');
    await resolutionNoteTextarea.fill(
      'Attached authentic Revenue Authority Income Certificate (Ref: SAMPLE-2026-01482) certifying annual income of ₹80,000 per annum matching declared intake value.'
    );

    // -------------------------------------------------------------------------
    // Step 8: Delta Re-verification (Transitions to UNDER_SCRUTINY)
    // -------------------------------------------------------------------------
    const reverifyBtn = page.locator('button:has-text("Submit Corrections & Re-Verify")');
    await reverifyBtn.click();

    // Verify delta re-verification success message
    await expect(page.locator('text=Delta Verification Passed')).toBeVisible({ timeout: 180000 });
    await expect(page.locator('text=STATUS: UNDER_SCRUTINY')).toBeVisible();
    await expect(page.locator('text=RESOLVED').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 9: Scrutiny Officer Review (01 · Submitted Document & 02 · AI-Assisted Scrutiny)
    // -------------------------------------------------------------------------
    // Switch to Scrutiny Officer persona (Dr. Sunita Toppo) via SIH Demo Bar
    const scrutinyOfficerBtn = page.locator('button:has-text("Dr. Sunita Toppo")');
    const scrutinyLoginPromise = page.waitForResponse(
      (resp) => resp.url().includes('/auth/login') && resp.status() === 200
    );
    await scrutinyOfficerBtn.click();
    await scrutinyLoginPromise;
    await expect(page.locator('text=SCRUTINY_OFFICER').first()).toBeVisible();

    // Navigate to the 2-Column Scrutiny Workspace for this application
    await page.goto(`/officer/applications/${generatedAppNum}`);
    await expect(page.locator('h1')).toBeVisible();

    // Assert Left Column: 01 · Submitted Document
    await expect(page.locator('span:has-text("01 ·")')).toBeVisible();
    await expect(page.locator('span:has-text("Submitted Document")')).toBeVisible();

    // Assert Right Column: 02 · AI-Assisted Scrutiny
    await expect(page.locator('span:has-text("02 ·")')).toBeVisible();
    await expect(page.locator('span:has-text("AI-Assisted Scrutiny")')).toBeVisible();
    await expect(page.locator('h3:has-text("EXTRACTED FIELDS")')).toBeVisible();

    // Verify proposal-accurate extracted field labels & evidence
    await expect(page.locator('text=Annual Family Income').first()).toBeVisible();
    await expect(page.locator('text=Applicant Name').first()).toBeVisible();
    await expect(page.locator('text=Sample Applicant').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 10: Officer Approval & Selection Decision (SELECTED + DBT Mock)
    // -------------------------------------------------------------------------
    // 10A: Scrutiny Officer Approval
    const approveBtn = page.locator('button:has-text("Approve Application")');
    await approveBtn.click();

    // If human-in-the-loop statutory override modal appears, record mandatory justification
    const overrideModal = page.locator('text=Mandatory Human Override Justification');
    if (await overrideModal.isVisible()) {
      await page.locator('textarea[placeholder*="Scrutiny Officer"]').fill(
        'Scrutiny Officer Dr. Sunita Toppo verified updated Income Certificate SAMPLE-2026-01482 directly against Sub-Divisional Officer Revenue Register. Declared income of ₹80,000 matches certified amount.'
      );
      await page.locator('button:has-text("Confirm & Record Override")').click();
    }

    await expect(
      page.locator('text=Application successfully approved and forwarded to National Selection Committee queue.')
    ).toBeVisible();

    // 10B: Switch to Selection Officer persona (Shri Rajeshwar Meena) via SIH Demo Bar
    const selectionOfficerBtn = page.locator('button:has-text("Shri R. Meena")');
    const selectionLoginPromise = page.waitForResponse(
      (resp) => resp.url().includes('/auth/login') && resp.status() === 200
    );
    await selectionOfficerBtn.click();
    await selectionLoginPromise;
    await expect(page.locator('text=SELECTION_OFFICER').first()).toBeVisible();

    // Refresh officer view to activate Selection Committee clearance
    await page.goto(`/officer/applications/${generatedAppNum}`);
    await expect(page.locator('span:has-text("Selection Committee")')).toBeVisible();

    // Record Selection Award Decision
    const awardBtn = page.locator('button:has-text("Issue Official Sanction Order")');
    await awardBtn.click();

    // Assert selection confirmation & sanction number
    await expect(page.locator('span:has-text("PROVISIONALLY SELECTED")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span:has-text("SANCTION-MOTA-NFST-2026-0001")').first()).toBeVisible();

    // 10C: Trigger Simulated Direct Benefit Transfer (DBT) Installment
    const triggerDbtBtn = page.locator('button:has-text("Trigger Simulated DBT")');
    await triggerDbtBtn.click();
    await expect(
      page.locator('text=Simulated DBT payment dispatched successfully!')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Disbursed via PFMS').first()).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 11: Immutable Audit History Verification
    // -------------------------------------------------------------------------
    const auditTrailBtn = page.locator('button:has-text("Audit Trail")');
    await auditTrailBtn.click();

    // Assert Slide-Over Audit Drawer appears
    await expect(page.locator('h3:has-text("Immutable Audit Trail History")')).toBeVisible();
    await expect(
      page.locator('text=Append-only ledger of all automated AI inferences')
    ).toBeVisible();

    // Verify key chronological audit events
    await expect(page.locator('span:has-text("APPLICATION_CREATED")').first()).toBeVisible();
    await expect(page.locator('span:has-text("DOCUMENT_INGESTED")').first()).toBeVisible();
    await expect(page.locator('span:has-text("AI_SCRUTINY_EXECUTED")').first()).toBeVisible();
    await expect(page.locator('span:has-text("OFFICER_REVIEW_SUBMITTED")').first()).toBeVisible();

    // Close drawer
    await page.locator('button:has-text("Close Drawer")').click();
    await expect(page.locator('h3:has-text("Immutable Audit Trail History")')).not.toBeVisible();
  });
});
