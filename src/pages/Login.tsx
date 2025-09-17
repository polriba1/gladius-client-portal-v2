import { devLog } from "@/lib/log";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [inviteReady, setInviteReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  // Handle invite link: exchange code and enable set-password flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromInvite = params.get('from') === 'invite' || params.get('type') === 'invite';
    const code = params.get('code');

    if (fromInvite) setIsInviteFlow(true);

    const exchange = async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setInviteReady(true);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setInviteReady(true);
        }
      } catch (e: unknown) {
        console.error('Invite exchange failed', e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        toast({
          title: "Error de invitación",
          description: errorMessage || "No se pudo validar el enlace.",
          variant: "destructive",
        });
      }
    };

    if (fromInvite) {
      exchange();
    }
  }, [toast]);

  // Check if user is already logged in and redirect to appropriate dashboard
  useEffect(() => {
    const redirectToDashboard = async (user: User) => {
      try {
        devLog('🔍 Redirecting user');
        
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            client_id,
            admin_role,
            can_switch_clients,
            active_client_id,
            clients!profiles_client_id_fkey (
              nom
            ),
            active_client:clients!profiles_active_client_id_fkey (
              nom
            )
          `)
          .eq('id', user.id)
          .single();

        devLog('📊 Profile fetch completed');
        if (error) devLog('❌ Profile error', error.message);

        if (error) {
          console.error('Error fetching profile:', error);
          window.location.href = '/dashboard';
          return;
        }

        // Check if user is an admin
        if (data?.admin_role === 'super_admin' || data?.admin_role === 'client_admin') {
          devLog('👑 Admin detected, redirecting to /admin-dashboard');
          window.location.href = '/admin-dashboard';
          return;
        }

        // For admins who have switched context, use active_client_id
        // For regular users, use their base client_id
        const activeClientId = data?.active_client_id || data?.client_id;
        const clientName = data?.active_client?.nom || data?.clients?.nom;
        
        devLog('🏢 Active client determined');
        devLog('🏢 Client determined');
        
        if (clientName?.toLowerCase().includes('salutdental')) {
          devLog('🦷 Salutdental client, redirecting to /salutdental-dashboard');
          window.location.href = '/salutdental-dashboard';
        } else {
          devLog('🔧 Other client, redirecting to /dashboard');
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Error in redirectToDashboard:', error);
        window.location.href = '/dashboard';
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        toast({
          title: "Inicio de sesión exitoso",  
          description: "Bienvenido"
        });
        setTimeout(() => {
          redirectToDashboard(session.user);
        }, 500);
      }
    });

    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await redirectToDashboard(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Clear unknown existing auth state first
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Success toast will be handled by onAuthStateChange
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error de autenticación",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Asegúrate de que ambas contraseñas sean iguales.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Contraseña demasiado corta",
        description: "Debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Contraseña establecida", description: "Tu contraseña se ha actualizado." });
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({ title: "No se pudo establecer la contraseña", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <header className="bg-background border-b border-border shadow-elegant">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">GladiusAI</h1>
          </Link>
          
          <div className="flex items-center space-x-2">
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <Card className="shadow-elegant border-border">
            <CardHeader className="text-center">
              {isInviteFlow ? (
                <>
                  <CardTitle className="text-2xl font-bold">Configurar contraseña</CardTitle>
                  <CardDescription>Has sido invitado. Establece tu contraseña para continuar.</CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
                  <CardDescription>Accede a tu cuenta de GladiusAI</CardDescription>
                </>
              )}
            </CardHeader>
            
            <CardContent>
              {isInviteFlow ? (
                inviteReady ? (
                  <form onSubmit={handleSetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nueva contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="new_password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="confirm_password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSettingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                    >
                      {isSettingPassword ? "..." : "Establecer contraseña"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">Validando invitación...</div>
                )
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="exemple@gladiusai.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "..." : "Iniciar sesión"}
                  </Button>
                </form>
              )}
            </CardContent>
            
            {!isInviteFlow && (
              <CardFooter className="flex flex-col space-y-4 text-center">
                <Link 
                  to="/reset-password" 
                  className="text-sm text-primary hover:underline"
                >
                  ¿Has olvidado la contraseña?
                </Link>
                
                <div className="text-sm text-muted-foreground">
                  Contacta con el administrador para obtener acceso
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;