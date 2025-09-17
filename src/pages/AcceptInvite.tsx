import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvite() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"verify"|"set"|"save"|"err">("verify");
  const [err, setErr] = useState<string|null>(null);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setPhase("set"); 
          return;
        }
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const at = hash.get("access_token"), rt = hash.get("refresh_token");
        if (at && rt) {
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) throw error;
          setPhase("set"); 
          return;
        }
        throw new Error("Missing invite code/tokens");
      } catch (e: unknown) { 
        setErr(e.message ?? String(e)); 
        setPhase("err"); 
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) { 
      setErr("Password must be at least 8 characters"); 
      return; 
    }
    setPhase("save"); 
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { 
      setErr(error.message); 
      setPhase("set"); 
      return; 
    }
    nav("/dashboard", { replace: true }); // AdminRedirect will route admins as needed
  };

  if (phase === "verify") return <div className="p-8">Validating invite…</div>;
  if (phase === "err") return <div className="p-8 text-red-600">Error: {err}</div>;

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-semibold mb-4">Create your password</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="pwd">New password</Label>
          <Input id="pwd" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          {err && <p className="text-sm text-red-600 mt-1">{err}</p>}
        </div>
        <Button type="submit" disabled={phase==="save"}>
          {phase==="save" ? "Saving…" : "Set password and continue"}
        </Button>
      </form>
    </div>
  );
}