import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AluguelCasas from "./pages/AluguelCasas";
import AdDetail from "./pages/AdDetail";
import NotFound from "./pages/NotFound";

import CategoryPage from "./pages/CategoryPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import UserDashboard from "./pages/UserDashboard";
import PostAdPage from "./pages/PostAdPage";
import PromoteAdPage from "./pages/PromoteAdPage";
import MinhaConta from "./pages/MinhaConta";
import HelpPage from "./pages/HelpPage";
import EditAdPage from "./pages/EditAdPage";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    async function debugAuth() {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("SESSION:", sessionData.session);

      const { data: userData } = await supabase.auth.getUser();
      console.log("USER:", userData.user);
    }
    debugAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/alugar-casa-apartamento" element={<AluguelCasas />} />
            <Route path="/c/:categorySlug" element={<CategoryPage />} />
            <Route path="/anuncio/:id" element={<AdDetail />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/esqueci-minha-senha" element={<ForgotPasswordPage />} />
            <Route path="/painel" element={<UserDashboard />} />
            <Route path="/meus-anuncios" element={<UserDashboard />} />
            <Route path="/publicar-anuncio" element={<PostAdPage />} />
            {/* <Route path="/anuncio/:id/promover" element={<PromoteAdPage />} /> */}
            <Route path="/anuncio/:id/editar" element={<EditAdPage />} />
            <Route path="/ajuda" element={<HelpPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
