import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Home from "./pages/app/Home";
import Profile from "./pages/app/Profile";
import Discover from "./pages/app/Discover";
import Chats from "./pages/app/Chats";
import Certificates from "./pages/app/Certificates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/app"
            element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/app/profile"
            element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/app/discover"
            element={<ProtectedRoute><AppLayout><Discover /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/app/chats"
            element={<ProtectedRoute><AppLayout><Chats /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/app/certificates"
            element={<ProtectedRoute><AppLayout><Certificates /></AppLayout></ProtectedRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
