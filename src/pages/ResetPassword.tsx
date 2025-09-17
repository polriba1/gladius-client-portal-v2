import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [language, setLanguage] = useState<'ca' | 'es'>('ca');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const texts = {
    ca: {
      title: "Restableix la contrasenya",
      description: "Introdueix el teu correu per rebre les instruccions",
      email: "Correu electrònic",
      send: "Envia instruccions",
      backToLogin: "Torna al login",
      success: "Instruccions enviades",
      successDescription: "Revisa el teu correu electrònic per restablir la contrasenya.",
      error: "Error en enviar instruccions. Connecta Supabase per habilitar aquesta funcionalitat."
    },
    es: {
      title: "Restablecer contraseña",
      description: "Introduce tu correo para recibir las instrucciones",
      email: "Correo electrónico",
      send: "Enviar instrucciones",
      backToLogin: "Volver al login",
      success: "Instrucciones enviadas",
      successDescription: "Revisa tu correo electrónico para restablecer la contraseña.",
      error: "Error al enviar instrucciones. Conecta Supabase para habilitar esta funcionalidad."
    }
  };

  const t = texts[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular el envío - aquí se integraría con Supabase
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: t.error,
        variant: "destructive"
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Link to="/login" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backToLogin}
            </Link>
          </div>

          <Card className="shadow-elegant border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "..." : t.send}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;