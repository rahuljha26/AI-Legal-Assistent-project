import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert" className="p-8 text-center bg-gray-50 min-h-screen flex flex-col justify-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <pre className="text-sm bg-white p-4 rounded shadow text-left mx-auto max-w-2xl overflow-auto text-gray-800">
        {error.message}
      </pre>
      <button onClick={resetErrorBoundary} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Try again
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </ErrorBoundary>,
);
