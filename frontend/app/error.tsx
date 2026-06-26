'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-xl font-bold text-red-600 mb-4">Algo salió mal</h2>
      <pre className="text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-lg max-w-2xl overflow-auto text-red-800 dark:text-red-300 mb-4 whitespace-pre-wrap">
        {error.message}
        {error.digest && <span className="block mt-2 text-xs text-red-500">Digest: {error.digest}</span>}
      </pre>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Reintentar
      </button>
    </div>
  );
}
