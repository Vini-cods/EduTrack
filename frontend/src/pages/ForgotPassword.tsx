import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import apiClient from '../api/client';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (err) {
      console.error(err);
      // Por segurança a mensagem de sucesso é mostrada mesmo se algo falhar,
      // já que o backend nunca revela se o email existe ou não.
    } finally {
      setSent(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl font-semibold text-ink">Esqueceu sua senha?</h1>
              <p className="text-graphite mt-2">
                Digite seu email e enviaremos instruções para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-graphite mb-1.5">Email</label>
                <TextField
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={isLoading}>
                Enviar instruções
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success-soft flex items-center justify-center">
              <Mail className="text-success" size={28} />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">Email enviado!</h2>
            <p className="text-graphite mb-6">
              Se uma conta existe com o email <strong className="text-ink font-medium">{email}</strong>, você receberá
              instruções para redefinir sua senha.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-crimson hover:text-crimson-dark font-medium transition-colors">
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};
