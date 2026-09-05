import Link from "next/link";
import type { Metadata } from "next";
import { Brain, Shield, Lock, Building, BarChart3, ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "TitleChain | Secure Property Transactions on the Blockchain",
};

const features = [
  {
    Icon: Brain,
    title: "AI Document Verification",
    description:
      "Our AI engine analyses submitted deeds, surveys, and ID documents for fraud indicators, OCR-extracts critical data, and flags anomalies before a human registrar reviews.",
  },
  {
    Icon: Shield,
    title: "Smart Escrow",
    description:
      "ETH-denominated escrow contracts release funds milestone by milestone — survey completion, government approval, final title transfer — protecting both buyer and seller.",
  },
  {
    Icon: Lock,
    title: "Immutable Records",
    description:
      "Every property title is anchored on-chain. Ownership records are immutable, transparent, and tamper-proof — accessible to all authorised parties at any time.",
  },
  {
    Icon: Building,
    title: "Government Workflow",
    description:
      "Built-in registrar workflow routes each transaction through the official approval chain. Digital signatures replace paper stamps and eliminate courier delays.",
  },
  {
    Icon: BarChart3,
    title: "Risk Assessment",
    description:
      "Verified identities are hashed and recorded on-chain. Parties transact knowing every participant has passed multi-document identity verification.",
  },
  {
    Icon: ScrollText,
    title: "Full Audit Trail",
    description:
      "Every action — document upload, AI verdict, registrar approval, fund release — is timestamped and logged with a blockchain hash, creating a complete chain of custody.",
  },
];

const stats = [
  { label: "Properties Registered", value: "12,400+" },
  { label: "Transactions Completed", value: "3,800+" },
  { label: "Uptime", value: "99.9%" },
  { label: "Average Closing Time", value: "4 days" },
];

const steps = [
  {
    step: "01",
    title: "Register & Verify Identity",
    description:
      "Create your account and submit government-issued ID documents. Our AI extracts and validates your details. The registrar grants KYC approval within 24 hours.",
  },
  {
    step: "02",
    title: "List & Document the Property",
    description:
      "The seller registers the property with address, land area, and type. Upload title deeds, survey plans, and tax clearance certificates. AI scans every document for fraud.",
  },
  {
    step: "03",
    title: "Initiate the Transaction",
    description:
      "The buyer makes an offer. Both parties sign digitally. A smart escrow contract is deployed holding the sale price until all milestones are met.",
  },
  {
    step: "04",
    title: "Government Review & Approval",
    description:
      "The registrar reviews the full audit trail and AI report. They approve or request additional documentation — all within the platform.",
  },
  {
    step: "05",
    title: "Blockchain Title Issuance",
    description:
      "Upon final approval, ownership is transferred on-chain. The escrow releases funds to the seller. The buyer receives a cryptographically signed title certificate.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-black/80 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <span className="text-gold text-2xl font-bold tracking-widest">◈</span>
              <span className="text-white font-bold text-lg tracking-widest uppercase">
                TITLECHAIN
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-white/60 hover:text-gold font-medium transition-colors text-sm tracking-wide"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-white/60 hover:text-gold font-medium transition-colors text-sm tracking-wide"
              >
                How It Works
              </a>
              <a
                href="#stats"
                className="text-white/60 hover:text-gold font-medium transition-colors text-sm tracking-wide"
              >
                About
              </a>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="text-white/70 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-primary text-sm px-5 py-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-gold/10 text-gold text-xs font-medium px-4 py-2 rounded-full mb-8 border border-gold/20 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span>LIVE IN 14 COUNTRIES ACROSS AFRICA AND THE MIDDLE EAST</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight uppercase">
            Secure Property.{" "}
            <span className="text-gold">Immutably.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 max-w-3xl mx-auto mb-10 font-light">
            TitleChain combines AI-powered document analysis, smart contract
            escrow, and government-grade registrar workflows to make real estate
            title transfers fast, transparent, and fraud-proof.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gold hover:bg-gold-light text-black font-bold rounded-lg transition-colors text-base tracking-wide"
            >
              Get Started
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-gold/40 text-gold hover:bg-gold/10 font-semibold rounded-lg transition-colors text-base"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="border-y border-white/8 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="py-4">
                <p className="text-3xl sm:text-4xl font-extrabold text-gold mb-1">
                  {stat.value}
                </p>
                <p className="text-white/40 text-sm font-medium tracking-wide uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-3">
              Platform Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Everything you need for a secure title transfer
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto text-base">
              From identity verification to blockchain title issuance, every
              step of the property transaction is handled with enterprise-grade
              security and auditability.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#0d0d0d] border border-white/8 rounded-lg p-6 hover:border-gold/30 transition-colors group"
              >
                <div className="mb-4 inline-block group-hover:scale-110 transition-transform">
                  <feature.Icon className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-white/40 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-[#080808] border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-3">
              Transaction Lifecycle
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              How a title transfer works
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto text-base">
              A typical transaction from listing to blockchain issuance takes
              under five business days — compared to weeks or months with
              traditional paper-based processes.
            </p>
          </div>
          <div className="space-y-4 max-w-3xl mx-auto">
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="flex gap-6 items-start bg-[#0d0d0d] border border-white/8 rounded-lg p-6 hover:border-gold/20 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <span className="text-gold font-mono text-sm font-bold">
                    {item.step}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1.5 tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-black border-t border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-gold text-4xl font-light mb-6 block">◈</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to secure your property on the blockchain?
          </h2>
          <p className="text-white/40 text-lg mb-10">
            Join thousands of property owners, buyers, and registrars who trust
            TitleChain for legally binding, fraud-proof title transfers.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-gold hover:bg-gold-light text-black font-bold rounded-lg transition-colors text-base tracking-wide"
            >
              Create Free Account
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 border border-gold/40 text-gold hover:bg-gold/10 font-semibold rounded-lg transition-colors text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#080808] border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-gold text-xl font-bold">◈</span>
              <span className="text-white font-bold tracking-widest text-sm uppercase">
                TITLECHAIN
              </span>
            </div>
            <p className="text-white/30 text-sm">
              &copy; {new Date().getFullYear()} TitleChain. All rights reserved.
              Property title transfers secured by the Ethereum blockchain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
