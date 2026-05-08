import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$code")({ component: Join });

function Join() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState("Verifica…");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      sessionStorage.setItem("pending_invite_code", code);
      nav({ to: "/login" });
      return;
    }
    (async () => {
      const { error } = await supabase.rpc("accept_household_invite", { _code: code.toUpperCase() });
      if (error) {
        setStatus("Codice non valido o scaduto");
        toast.error(error.message);
      } else {
        toast.success("Benvenuto nella casa!");
        nav({ to: "/home" });
      }
    })();
  }, [code, user, loading, nav]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {status}
    </div>
  );
}