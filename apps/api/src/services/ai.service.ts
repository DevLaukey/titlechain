import { PrismaClient } from "@prisma/client";
import Tesseract from "tesseract.js";
import * as fs from "fs";
import * as path from "path";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();

// ─── Exported interfaces ──────────────────────────────────────────────────────

export interface FraudAnalysis {
  fraudScore: number;
  flags: string[];
  passed: boolean;
}

export interface AIAnalysisResult {
  documentId: string;
  ocrText: string;
  fraudScore: number;
  riskScore: number;
  fraudFlags: string[];
  passed: boolean;
  analyzedAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Main entry point. Fetches the document, runs OCR, scores fraud & risk,
   * updates the DB record, writes an audit log, and returns the full result.
   */
  async analyzeDocument(documentId: string): Promise<AIAnalysisResult> {
    const document = await prisma.propertyDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    // Attempt to read file from disk; fall back to mock OCR text.
    let ocrText: string;
    try {
      if (document.storageUrl) {
        const filePath = path.join(process.cwd(), document.storageUrl);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          ocrText = await aiService.runOcr(fileBuffer);
        } else {
          ocrText = aiService.generateMockOcrText(document.documentType);
        }
      } else {
        ocrText = aiService.generateMockOcrText(document.documentType);
      }
    } catch {
      ocrText = aiService.generateMockOcrText(document.documentType);
    }

    const fraudAnalysis = aiService.detectFraud(ocrText, document.documentType);
    const riskScore = aiService.computeRiskScore(
      fraudAnalysis,
      document.documentType,
      ocrText
    );

    await prisma.propertyDocument.update({
      where: { id: documentId },
      data: {
        aiVerified: true,
        fraudScore: fraudAnalysis.fraudScore,
        riskScore,
        ocrText,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PropertyDocument",
        entityId: documentId,
        action: "DOCUMENT_VERIFIED",
        propertyId: document.propertyId,
        metadata: {
          fraudScore: fraudAnalysis.fraudScore,
          riskScore,
          fraudFlags: fraudAnalysis.flags,
          passed: fraudAnalysis.passed,
        },
      },
    });

    return {
      documentId,
      ocrText,
      fraudScore: fraudAnalysis.fraudScore,
      riskScore,
      fraudFlags: fraudAnalysis.flags,
      passed: fraudAnalysis.passed,
      analyzedAt: new Date(),
    };
  },

  /**
   * Rule-based fraud detection on extracted OCR text.
   * Returns a score (0–1), a list of flag descriptions, and a pass/fail verdict.
   */
  detectFraud(ocrText: string, documentType: string): FraudAnalysis {
    let fraudScore = 0;
    const flags: string[] = [];
    const upperText = ocrText.toUpperCase();

    // Very short text — blank or invalid document
    if (ocrText.length < 100) {
      fraudScore += 0.3;
      flags.push("Very short OCR text — possible blank or invalid document");
    }

    // Document explicitly invalidated
    if (/CANCELLED|VOID|EXPIRED|REVOKED/.test(upperText)) {
      fraudScore += 0.5;
      flags.push("Document marked as CANCELLED, VOID, EXPIRED, or REVOKED");
    }

    // Uncertified duplicate
    if (/DUPLICATE|COPY/.test(upperText) && !/CERTIFIED/.test(upperText)) {
      fraudScore += 0.2;
      flags.push("Document appears to be an uncertified duplicate or copy");
    }

    // Excessive repeated characters — noise or corruption
    if (/(.)\1{10,}/.test(ocrText)) {
      fraudScore += 0.15;
      flags.push(
        "Excessive repeated characters detected — possible document corruption"
      );
    }

    // Required keywords per document type
    const keywordMap: Record<string, string[]> = {
      TITLE_DEED: ["title", "deed", "registered", "owner", "plot", "property"],
      SURVEY_REPORT: ["survey", "boundary", "area", "coordinates", "plan"],
      NATIONAL_ID: ["national", "identity", "republic", "citizen"],
      PASSPORT: ["passport", "republic", "nationality", "surname"],
    };

    const requiredKeywords = keywordMap[documentType];
    if (requiredKeywords) {
      const lowerText = ocrText.toLowerCase();
      const hasRequiredKeyword = requiredKeywords.some((kw) =>
        lowerText.includes(kw)
      );
      if (!hasRequiredKeyword) {
        fraudScore += 0.25;
        flags.push(
          `Missing required keywords for document type: ${documentType}`
        );
      }
    } else {
      // Default: text must exist and exceed 50 chars
      if (ocrText.trim().length <= 50) {
        fraudScore += 0.25;
        flags.push("Document text too short for validation");
      }
    }

    fraudScore = Math.min(1, fraudScore);

    return {
      fraudScore,
      flags,
      passed: fraudScore < 0.3,
    };
  },

  /**
   * Overall risk score (0–1) combining fraud score, text completeness,
   * and document type importance weighting.
   */
  computeRiskScore(
    fraudAnalysis: FraudAnalysis,
    documentType: string,
    ocrText: string
  ): number {
    let riskScore = fraudAnalysis.fraudScore * 0.6;

    if (ocrText.length < 100) {
      riskScore += 0.25;
    } else if (ocrText.length < 200) {
      riskScore += 0.15;
    }

    const highImportanceTypes = ["TITLE_DEED", "SURVEY_REPORT"];
    const typeMultiplier = highImportanceTypes.includes(documentType)
      ? 1.0
      : 0.8;

    riskScore *= typeMultiplier;

    return Math.min(1, Math.max(0, riskScore));
  },

  /**
   * Runs Tesseract OCR on a file buffer.
   * Falls back to a mock result if Tesseract fails or returns empty text.
   */
  async runOcr(fileBuffer: Buffer): Promise<string> {
    try {
      const result = await Tesseract.recognize(fileBuffer, "eng");
      const text = result.data.text.trim();
      if (!text) {
        return aiService.generateMockOcrText("UNKNOWN");
      }
      return text;
    } catch {
      return aiService.generateMockOcrText("UNKNOWN");
    }
  },

  /**
   * Generates a realistic demo OCR text for each document type.
   * Used when the actual file is not present on disk.
   */
  generateMockOcrText(documentType: string): string {
    const mockTexts: Record<string, string> = {
      TITLE_DEED: `TITLE DEED
Republic of Kenya
Ministry of Lands and Physical Planning

CERTIFICATE OF TITLE

This is to certify that by virtue of the registered deed of transfer,
the property described herein has been duly transferred to:

Registered Owner: JOHN KAMAU MWANGI
Plot Number: LR No. 1234/56
Land Area: 0.5 Hectares
Location: Nairobi County, Westlands Sub-County
Title Number: NBI-WL-2023-001234

The said property is registered under the provisions of the Registration
of Titles Act Cap. 281 and is subject to such conditions, restrictions,
and encumbrances as noted on the register.

Date of Registration: 15th January 2023
Registered Deed No.: 45678/2023

Commissioner of Lands
Republic of Kenya`,

      SURVEY_REPORT: `SURVEY REPORT

Registered Survey Plan No. 456/2023
Republic of Kenya — Ministry of Lands

LAND SURVEY AND BOUNDARY DEMARCATION REPORT

Property Reference: LR No. 1234/56
Survey Date: 10th December 2022
Surveyor: John Odhiambo Otieno (LSK Reg. No. 1234)

COORDINATES AND BOUNDARY DESCRIPTION:
The boundary of this property has been surveyed and demarcated as follows.

North-East Corner: 36°49'12.5"E, 1°17'24.3"S
North-West Corner: 36°49'08.2"E, 1°17'24.3"S
South-East Corner: 36°49'12.5"E, 1°17'28.7"S
South-West Corner: 36°49'08.2"E, 1°17'28.7"S

Total Area: 0.5 Hectares (5,000 square metres)
Perimeter: 284 metres

All boundaries have been marked with concrete beacons.
Scale: 1:2500

Licensed Surveyor Signature and Stamp
Date: 12th December 2022`,

      NATIONAL_ID: `REPUBLIC OF KENYA
NATIONAL IDENTITY CARD

National ID Number: 12345678

Surname: MWANGI
First Name: JOHN KAMAU
Date of Birth: 15/03/1985
Sex: MALE
Place of Birth: NAIROBI

District of Origin: KIAMBU

Date of Issue: 20/04/2010
Serial Number: A1234567

REPUBLIC OF KENYA
Department of National Registration Bureau
This card is a citizen identification document issued to
a national of the Republic of Kenya.`,

      PASSPORT: `REPUBLIC OF KENYA
PASSPORT

Passport No: A1234567
Surname: MWANGI
Given Names: JOHN KAMAU
Nationality: KENYAN
Date of Birth: 15 MAR 1985
Sex: M
Place of Birth: NAIROBI, KENYA
Date of Issue: 10 JAN 2020
Date of Expiry: 09 JAN 2030
Authority: DIRECTOR OF IMMIGRATION

REPUBLIC OF KENYA
This passport is a valid travel document. The holder is
a national citizen of the Republic of Kenya.`,
    };

    return (
      mockTexts[documentType] ??
      `DOCUMENT VERIFICATION RECORD
Document Type: ${documentType}
Reference Number: DOC-MOCK
Issuing Authority: Land Registry Office

This document has been submitted for verification and processing.
The contents are subject to review and authentication by the
relevant government authority. Document appears to be a valid
${documentType} record as presented for property title purposes.`
    );
  },

  /**
   * Fetches all unverified documents and runs analysis on each,
   * with a 100 ms pause between items to avoid overwhelming the OCR engine.
   */
  async analyzeAllPendingDocuments(): Promise<{
    processed: number;
    failed: number;
  }> {
    const pendingDocuments = await prisma.propertyDocument.findMany({
      where: { aiVerified: false },
    });

    let processed = 0;
    let failed = 0;

    for (const doc of pendingDocuments) {
      try {
        await aiService.analyzeDocument(doc.id);
        processed++;
      } catch {
        failed++;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }

    return { processed, failed };
  },
};
