import Link from 'next/link';

// Simple minimalist 404 page (black & white)
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      {/* Big 404 heading */}
      <h1 className="text-[120px] md:text-[160px] font-extrabold leading-none text-black">
        404
      </h1>

      {/* Horizontal divider */}
      <div className="w-24 h-[3px] bg-black my-6" />

      {/* Main message */}
      <h2 className="text-xl md:text-2xl font-medium text-black mb-2">
        Oops! This page took a wrong turn
      </h2>

      {/* Sub-message */}
      <p className="text-sm text-gray-500 mb-10">
        The page you&apos;re looking for doesn&apos;t exist
      </p>

      {/* Home button */}
      <Link
        href="/"
        className="inline-block bg-black text-white font-semibold px-8 py-3 rounded-md shadow hover:bg-gray-800 transition-colors"
      >
        Take me home
      </Link>
    </div>
  );
}
