import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { WsProvider } from "./context/WsContext";
import { ToastProvider } from "./context/ToastContext";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AppLayout from "./components/Layout";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 className="text-2xl font-bold text-red-500 mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-400 mb-4">{error.message}</p>
      <button
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        onClick={resetErrorBoundary}
      >
        Try Again
      </button>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    setAuthLoading(false);
  }, []);

  if (authLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <WsProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ToastProvider>
        </WsProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
