import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[#D4AF37] text-8xl font-extrabold mb-4 tracking-tight">
          404
        </p>
        <h1 className="text-white text-2xl font-bold mb-3 tracking-wide">
          Page Not Found
        </h1>
        <p className="text-white/40 text-base mb-10">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#D4AF37] hover:bg-[#E8C84A] text-black font-semibold rounded-lg transition-colors text-sm"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-semibold rounded-lg transition-colors text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
