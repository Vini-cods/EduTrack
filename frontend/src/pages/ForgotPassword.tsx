import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.jpg';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSent(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="EduTrack" className="h-20 rounded-xl" />
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text">
                Esqueceu sua senha?
              </h1>
              <p className="text-text-secondary mt-2">
                Digite seu email e enviaremos instruções para redefinir sua
                senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-border bg-white text-text placeholder:text-gray-400 outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-100 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold text-base hover:from-primary-dark hover:to-primary transition-all duration-300 shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Enviando...' : 'Enviar Instruções'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
              <Mail className="text-green-600" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">
              Email Enviado!
            </h2>
            <p className="text-text-secondary mb-6">
              Se uma conta existe com o email <strong>{email}</strong>,
              você receberá instruções para redefinir sua senha.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary-light hover:text-primary font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
};
