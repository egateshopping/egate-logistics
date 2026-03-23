import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Stores from "./pages/Stores";
import NewOrder from "./pages/NewOrder";
import OrderDetails from "./pages/OrderDetails";
import Admin from "./pages/Admin";
import AdminWeightSettings from "./pages/AdminWeightSettings";
import AdminShipments from "./pages/AdminShipments";
import CustomerProfile from "./pages/CustomerProfile";
import ShipmentDetails from "./pages/ShipmentDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/order/new" element={<NewOrder />} />
            <Route path="/order/:id" element={<OrderDetails />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/shipments" element={<AdminShipments />} />
            <Route path="/admin/settings/weights" element={<AdminWeightSettings />} />
            <Route path="/admin/customer/:userId" element={<CustomerProfile />} />
            <Route path="/shipment/:shipmentId" element={<ShipmentDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
