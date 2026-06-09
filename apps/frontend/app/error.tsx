'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold text-danger mb-4">Xatolik yuz berdi!</h2>
      <button
        onClick={() => reset()}
        className="btn-primary px-6 py-2"
      >
        Qaytadan urinish
      </button>
    </div>
  );
}
