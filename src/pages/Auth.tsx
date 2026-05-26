import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Ruler, Shield } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Auth() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-accent p-4">
              <Ruler className="h-12 w-12 text-accent-foreground" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-primary-foreground font-heading">
            Portale Misurazioni
          </h1>
          <p className="text-lg text-primary-foreground/80">
            Il tuo sistema professionale per la raccolta misure e gestione preventivi. Rapido, preciso, digitale.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 text-primary-foreground/60">
            <Shield className="h-5 w-5" />
            <span className="text-sm">Dati protetti e sicuri</span>
          </div>
        </div>
      </div>

      {/* Right side - auth forms */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-2xl gradient-accent p-3">
                <Ruler className="h-8 w-8 text-accent-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Portale Misurazioni</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="register">Registrati</TabsTrigger>
            </TabsList>
            <TabsContent value="login"><LoginForm /></TabsContent>
            <TabsContent value="register"><RegisterForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success('Accesso effettuato!');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante l\'accesso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Accedi al portale</CardTitle>
        <CardDescription>Inserisci le tue credenziali per accedere</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="info@azienda.it" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', company_name: '', phone: '', client_code: '' });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(s => s + 1); return; }
    setSubmitting(true);
    try {
      await signUp(form.email, form.password, {
        full_name: form.full_name,
        company_name: form.company_name,
        phone: form.phone,
        client_code: form.client_code,
      });
      toast.success('Registrazione completata! Controlla la tua email per confermare.');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante la registrazione');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Email', 'Dati operatore', 'Password'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Crea il tuo account</CardTitle>
        <CardDescription>Passo {step} di 3 — {STEPS[step - 1]}</CardDescription>
        {/* Step dots */}
        <div className="flex items-center gap-2 pt-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required placeholder="info@azienda.it" autoFocus />
            </div>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reg-fullname">Nome e cognome</Label>
                <Input id="reg-fullname" value={form.full_name} onChange={e => update('full_name', e.target.value)} required placeholder="Es. Leonardo Pratelli" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-company">Nome Azienda</Label>
                <Input id="reg-company" value={form.company_name} onChange={e => update('company_name', e.target.value)} required placeholder="La tua azienda S.r.l." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Telefono</Label>
                <Input id="reg-phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="+39 333 1234567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-code">Codice Cliente</Label>
                <Input id="reg-code" value={form.client_code} onChange={e => update('client_code', e.target.value)} required placeholder="CLT-001" />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" value={form.password} onChange={e => update('password', e.target.value)} required placeholder="Minimo 6 caratteri" minLength={6} autoFocus />
            </div>
          )}

          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
                Indietro
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={submitting}>
              {step < 3 ? 'Avanti' : submitting ? 'Registrazione...' : 'Registrati'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
