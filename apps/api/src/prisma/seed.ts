import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function fakeIpfsHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function fakeOnChainId(titleNumber: string): string {
  return "0x" + crypto.createHash("sha256").update(titleNumber + "chain").digest("hex");
}

async function main() {
  console.log("🌱 Seeding TitleChain demo data...");

  // ── Wipe existing data (order matters for FK constraints) ──────────────────
  await prisma.auditLog.deleteMany();
  await prisma.govApproval.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.propertyDocument.deleteMany();
  await prisma.property.deleteMany();
  await prisma.kycRecord.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log("Creating users...");

  const [admin, alice, david, amara, john] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@titlechain.io",
        passwordHash: await bcrypt.hash("Admin@1234", 12),
        role: "ADMIN" as never,
        kycStatus: "VERIFIED" as never,
        firstName: "System",
        lastName: "Administrator",
        phone: "+1-555-000-0001",
      },
    }),
    prisma.user.create({
      data: {
        email: "alice.johnson@email.com",
        passwordHash: await bcrypt.hash("Buyer@1234", 12),
        role: "BUYER" as never,
        kycStatus: "VERIFIED" as never,
        firstName: "Alice",
        lastName: "Johnson",
        phone: "+254-700-100-001",
        walletAddress: "0xabc1230000000000000000000000000000000001",
      },
    }),
    prisma.user.create({
      data: {
        email: "david.osei@email.com",
        passwordHash: await bcrypt.hash("Seller@1234", 12),
        role: "SELLER" as never,
        kycStatus: "VERIFIED" as never,
        firstName: "David",
        lastName: "Osei",
        phone: "+254-700-100-002",
        walletAddress: "0xabc1230000000000000000000000000000000002",
      },
    }),
    prisma.user.create({
      data: {
        email: "registrar.amara@gov.ke",
        passwordHash: await bcrypt.hash("Registrar@1234", 12),
        role: "REGISTRAR" as never,
        kycStatus: "VERIFIED" as never,
        firstName: "Amara",
        lastName: "Diallo",
        phone: "+254-700-100-003",
      },
    }),
    prisma.user.create({
      data: {
        email: "john.smith@email.com",
        passwordHash: await bcrypt.hash("User@1234", 12),
        role: "BUYER" as never,
        kycStatus: "PENDING" as never,
        firstName: "John",
        lastName: "Smith",
        phone: "+254-700-100-004",
      },
    }),
  ]);

  // ── KYC Records ────────────────────────────────────────────────────────────
  console.log("Creating KYC records...");

  const now = new Date();
  await Promise.all([
    prisma.kycRecord.create({
      data: {
        userId: admin.id,
        documentType: "NATIONAL_ID",
        documentHash: fakeIpfsHash("admin-national-id"),
        status: "VERIFIED" as never,
        notes: "Verified by system during initial setup",
        verifiedAt: now,
      },
    }),
    prisma.kycRecord.create({
      data: {
        userId: alice.id,
        documentType: "PASSPORT",
        documentHash: fakeIpfsHash("alice-passport-ke-A12345"),
        status: "VERIFIED" as never,
        notes: "Identity verified — Kenyan passport, valid until 2029",
        verifiedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.kycRecord.create({
      data: {
        userId: david.id,
        documentType: "NATIONAL_ID",
        documentHash: fakeIpfsHash("david-national-id-gh-456789"),
        status: "VERIFIED" as never,
        notes: "Identity verified — Ghanaian national ID",
        verifiedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.kycRecord.create({
      data: {
        userId: amara.id,
        documentType: "NATIONAL_ID",
        documentHash: fakeIpfsHash("amara-gov-id-ke-789012"),
        status: "VERIFIED" as never,
        notes: "Government employee — ID verified by Ministry of Lands",
        verifiedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // ── Properties ─────────────────────────────────────────────────────────────
  console.log("Creating properties...");

  const property1 = await prisma.property.create({
    data: {
      titleNumber: "TC-2024-KE-0047",
      ownerId: david.id,
      status: "APPROVED" as never,
      address: "24 Maple Ridge Drive",
      city: "Nairobi",
      state: "Nairobi County",
      country: "Kenya",
      postalCode: "00100",
      landArea: 450,
      landAreaUnit: "sqm",
      propertyType: "RESIDENTIAL",
      estimatedValue: "12500000",
      metadataHash: fakeIpfsHash("TC-2024-KE-0047-metadata-v1"),
      blockchainTxHash: "0x" + fakeIpfsHash("TC-2024-KE-0047-registration-tx"),
      onChainId: fakeOnChainId("TC-2024-KE-0047"),
    },
  });

  const property2 = await prisma.property.create({
    data: {
      titleNumber: "TC-2024-KE-0091",
      ownerId: david.id,
      status: "PENDING_REVIEW" as never,
      address: "Lot 7B, Westlands Commercial Plaza",
      city: "Nairobi",
      state: "Nairobi County",
      country: "Kenya",
      postalCode: "00800",
      landArea: 1200,
      landAreaUnit: "sqm",
      propertyType: "COMMERCIAL",
      estimatedValue: "45000000",
      metadataHash: fakeIpfsHash("TC-2024-KE-0091-metadata-v1"),
    },
  });

  const property3 = await prisma.property.create({
    data: {
      titleNumber: "TC-2024-KE-0118",
      ownerId: alice.id,
      status: "DRAFT" as never,
      address: "Plot 22, Karen Estate",
      city: "Nairobi",
      state: "Nairobi County",
      country: "Kenya",
      postalCode: "00502",
      landArea: 600,
      landAreaUnit: "sqm",
      propertyType: "RESIDENTIAL",
      estimatedValue: "8200000",
    },
  });

  // ── Property Documents ─────────────────────────────────────────────────────
  console.log("Creating property documents...");

  const [doc1a, doc1b] = await Promise.all([
    prisma.propertyDocument.create({
      data: {
        propertyId: property1.id,
        documentType: "TITLE_DEED",
        fileName: "TC-2024-KE-0047-Title-Deed.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0047-title-deed-content"),
        storageUrl: `/uploads/${property1.id}/TC-2024-KE-0047-Title-Deed.pdf`,
        aiVerified: true,
        fraudScore: 0.02,
        riskScore: 0.08,
        ocrText:
          "TITLE DEED — Plot No. 24 Maple Ridge Drive, Nairobi County. Registered owner: David Osei. Area: 450 square metres. Date of registration: 12 March 2021.",
      },
    }),
    prisma.propertyDocument.create({
      data: {
        propertyId: property1.id,
        documentType: "SURVEY_REPORT",
        fileName: "TC-2024-KE-0047-Survey-Report.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0047-survey-report-content"),
        storageUrl: `/uploads/${property1.id}/TC-2024-KE-0047-Survey-Report.pdf`,
        aiVerified: true,
        fraudScore: 0.01,
        riskScore: 0.05,
        ocrText:
          "SURVEY REPORT — Reference No. SR-KE-2024-9847. Subject property: 24 Maple Ridge Drive. Boundaries confirmed. No encroachments detected. Prepared by: Kenya National Survey Office.",
      },
    }),
    prisma.propertyDocument.create({
      data: {
        propertyId: property2.id,
        documentType: "TITLE_DEED",
        fileName: "TC-2024-KE-0091-Title-Deed.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0091-title-deed-content"),
        storageUrl: `/uploads/${property2.id}/TC-2024-KE-0091-Title-Deed.pdf`,
        aiVerified: false,
        fraudScore: 0.15,
        riskScore: 0.22,
      },
    }),
    prisma.propertyDocument.create({
      data: {
        propertyId: property2.id,
        documentType: "LAND_VALUATION",
        fileName: "TC-2024-KE-0091-Valuation-Report.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0091-valuation-content"),
        storageUrl: `/uploads/${property2.id}/TC-2024-KE-0091-Valuation-Report.pdf`,
        aiVerified: false,
      },
    }),
    prisma.propertyDocument.create({
      data: {
        propertyId: property3.id,
        documentType: "TITLE_DEED",
        fileName: "TC-2024-KE-0118-Title-Deed-Draft.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0118-title-deed-draft"),
        storageUrl: `/uploads/${property3.id}/TC-2024-KE-0118-Title-Deed-Draft.pdf`,
        aiVerified: false,
      },
    }),
    prisma.propertyDocument.create({
      data: {
        propertyId: property3.id,
        documentType: "SURVEY_REPORT",
        fileName: "TC-2024-KE-0118-Survey-Preliminary.pdf",
        ipfsHash: fakeIpfsHash("TC-2024-KE-0118-survey-preliminary"),
        storageUrl: `/uploads/${property3.id}/TC-2024-KE-0118-Survey-Preliminary.pdf`,
        aiVerified: false,
      },
    }),
  ]);

  // ── Transaction ────────────────────────────────────────────────────────────
  console.log("Creating transaction...");

  const transaction = await prisma.transaction.create({
    data: {
      propertyId: property1.id,
      buyerId: alice.id,
      sellerId: david.id,
      status: "GOV_REVIEW" as never,
      salePrice: "12500000",
      currency: "KES",
    },
  });

  // ── Escrow ─────────────────────────────────────────────────────────────────
  console.log("Creating escrow...");

  await prisma.escrow.create({
    data: {
      transactionId: transaction.id,
      contractAddress: "0x" + fakeIpfsHash("escrow-contract-maple-ridge").slice(0, 40),
      amount: "12500000",
      status: "FUNDED" as never,
      milestones: [
        {
          id: crypto.randomUUID(),
          description: "Initial deposit (30%)",
          amount: "3750000",
          released: true,
          releasedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          description: "On government approval (50%)",
          amount: "6250000",
          released: false,
          releasedAt: null,
        },
        {
          id: crypto.randomUUID(),
          description: "On title transfer completion (20%)",
          amount: "2500000",
          released: false,
          releasedAt: null,
        },
      ],
      fundedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Government Approval ────────────────────────────────────────────────────
  console.log("Creating government approval record...");

  await prisma.govApproval.create({
    data: {
      transactionId: transaction.id,
      registrarId: amara.id,
      action: "REVIEW_INITIATED",
      notes:
        "Documents received and under review. Title deed verified. Awaiting final cadastral confirmation from Nairobi County office.",
    },
  });

  // ── Audit Log ──────────────────────────────────────────────────────────────
  console.log("Creating audit trail...");

  const auditEntries = [
    {
      entityType: "User",
      entityId: david.id,
      action: "USER_REGISTERED",
      actorId: david.id,
      metadata: { email: david.email, method: "email" },
      createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "User",
      entityId: david.id,
      action: "KYC_VERIFIED",
      actorId: admin.id,
      metadata: { documentType: "NATIONAL_ID", verifiedBy: "admin@titlechain.io" },
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Property",
      entityId: property1.id,
      action: "PROPERTY_CREATED",
      actorId: david.id,
      propertyId: property1.id,
      metadata: { titleNumber: "TC-2024-KE-0047", address: "24 Maple Ridge Drive" },
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "PropertyDocument",
      entityId: doc1a.id,
      action: "DOCUMENT_UPLOADED",
      actorId: david.id,
      propertyId: property1.id,
      metadata: { fileName: "TC-2024-KE-0047-Title-Deed.pdf", documentType: "TITLE_DEED" },
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "PropertyDocument",
      entityId: doc1a.id,
      action: "DOCUMENT_VERIFIED",
      actorId: admin.id,
      propertyId: property1.id,
      metadata: { fraudScore: 0.02, riskScore: 0.08, verdict: "PASS" },
      blockchainHash: "0x" + fakeIpfsHash("doc-verification-" + doc1a.id),
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Property",
      entityId: property1.id,
      action: "PROPERTY_APPROVED",
      actorId: admin.id,
      propertyId: property1.id,
      metadata: { titleNumber: "TC-2024-KE-0047", approvedBy: "admin@titlechain.io" },
      blockchainHash: "0x" + fakeIpfsHash("property-approval-" + property1.id),
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Transaction",
      entityId: transaction.id,
      action: "TRANSACTION_INITIATED",
      actorId: alice.id,
      propertyId: property1.id,
      transactionId: transaction.id,
      metadata: {
        buyer: "alice.johnson@email.com",
        seller: "david.osei@email.com",
        salePrice: "12500000 KES",
      },
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Escrow",
      entityId: transaction.id,
      action: "ESCROW_CREATED",
      actorId: alice.id,
      propertyId: property1.id,
      transactionId: transaction.id,
      metadata: { amount: "12500000 KES", milestones: 3 },
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Escrow",
      entityId: transaction.id,
      action: "ESCROW_FUNDED",
      actorId: alice.id,
      propertyId: property1.id,
      transactionId: transaction.id,
      metadata: { amountFunded: "12500000 KES", milestoneReleased: "Initial deposit (30%) — 3,750,000 KES" },
      blockchainHash: "0x" + fakeIpfsHash("escrow-funded-" + transaction.id),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      entityType: "Transaction",
      entityId: transaction.id,
      action: "GOV_APPROVAL_REQUESTED",
      actorId: admin.id,
      propertyId: property1.id,
      transactionId: transaction.id,
      metadata: {
        registrar: "registrar.amara@gov.ke",
        documents: ["Title Deed", "Survey Report"],
      },
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry as never });
  }

  console.log("\n✅ Seed complete. Demo accounts:");
  console.log("  Admin:     admin@titlechain.io      / Admin@1234");
  console.log("  Buyer:     alice.johnson@email.com  / Buyer@1234");
  console.log("  Seller:    david.osei@email.com     / Seller@1234");
  console.log("  Registrar: registrar.amara@gov.ke   / Registrar@1234");
  console.log("  Pending:   john.smith@email.com     / User@1234");
  console.log("\n  Demo property: 24 Maple Ridge Drive (TC-2024-KE-0047)");
  console.log("  Transaction status: GOV_REVIEW — Escrow: FUNDED (30% released)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
