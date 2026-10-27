'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Send } from 'lucide-react';
import { useState } from 'react';

interface FooterV2Props {
  getAuthLink?: (link: string) => string;
}

const FooterV2 = ({ getAuthLink = (link) => link }: FooterV2Props) => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    setSubscribeStatus('idle');

    // Simular envio (adicionar integração real depois)
    setTimeout(() => {
      setSubscribeStatus('success');
      setEmail('');
      setIsSubscribing(false);

      setTimeout(() => {
        setSubscribeStatus('idle');
      }, 3000);
    }, 1000);
  };

  const quickLinks = [
    { label: 'Sobre', href: '#sobre' },
    { label: 'Serviços', href: '#servicos' },
    { label: 'Projetos', href: '#projetos' },
    { label: 'Equipe', href: '#equipe' },
    { label: 'Contato', href: '#cotacao' },
  ];

  const services = [
    { label: 'Mineração de Cobre', href: '#servicos' },
    { label: 'Investimento', href: getAuthLink('/auth/register') },
    { label: 'Fornecimento B2B', href: '#cotacao' },
    { label: 'Consultoria', href: '#cotacao' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ];

  const scrollToSection = (id: string) => {
    if (id.startsWith('#')) {
      const element = document.getElementById(id.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-copper-primary to-gold-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
                MinerStone
              </span>
            </Link>

            <p className="text-gray-400 mb-6 leading-relaxed">
              Transformando o futuro através da mineração sustentável e
              inovadora. Conectando pessoas à riqueza mineral de forma justa e
              transparente.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white/5 hover:bg-gradient-to-br hover:from-copper-primary hover:to-gold-accent rounded-lg transition-all duration-300"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold-accent">Links Rápidos</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('#') ? (
                    <button
                      onClick={() => scrollToSection(link.href)}
                      className="text-gray-400 hover:text-copper-primary transition-colors duration-300"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-copper-primary transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold-accent">Serviços</h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.label}>
                  {service.href.startsWith('#') ? (
                    <button
                      onClick={() => scrollToSection(service.href)}
                      className="text-gray-400 hover:text-copper-primary transition-colors duration-300"
                    >
                      {service.label}
                    </button>
                  ) : (
                    <Link
                      href={service.href}
                      className="text-gray-400 hover:text-copper-primary transition-colors duration-300"
                    >
                      {service.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact + Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold-accent">Contato</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-400">
                <MapPin className="w-5 h-5 mt-1 text-copper-primary flex-shrink-0" />
                <span>São Paulo, SP<br />Brasil</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-5 h-5 text-copper-primary flex-shrink-0" />
                <a href="tel:+5511999999999" className="hover:text-copper-primary transition-colors">
                  +55 11 9999-9999
                </a>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-5 h-5 text-copper-primary flex-shrink-0" />
                <a href="mailto:contato@minerstone.com" className="hover:text-copper-primary transition-colors">
                  contato@minerstone.com
                </a>
              </li>
            </ul>

            {/* Newsletter */}
            <h3 className="text-lg font-bold mb-4 text-gold-accent">Newsletter</h3>
            <form onSubmit={handleNewsletter} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu email"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-copper-primary focus:border-transparent transition-all"
                />
              </div>
              <motion.button
                type="submit"
                disabled={isSubscribing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-4 py-3 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Inscrever</span>
                  </>
                )}
              </motion.button>
              {subscribeStatus === 'success' && (
                <p className="text-green-400 text-sm">✓ Inscrito com sucesso!</p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} MinerStone. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-copper-primary transition-colors"
              >
                Privacidade
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-copper-primary transition-colors"
              >
                Termos de Uso
              </Link>
              <Link
                href="#sobre"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('#sobre');
                }}
                className="text-gray-400 hover:text-copper-primary transition-colors"
              >
                Sobre Nós
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV2;
