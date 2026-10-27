'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Poppins } from 'next/font/google';
import LogoMinerstone from '../../LogoMinerstone';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

interface NavbarProps {
  getAuthLink?: (link: string) => string;
}

const Navbar = ({ getAuthLink = (link) => link }: NavbarProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      // Mostrar navbar quando no topo
      if (currentScrollY < 10) {
        setIsVisible(true);
        setIsScrolled(false);
      } else {
        setIsScrolled(true);
        // Esconder ao rolar para baixo, mostrar ao rolar para cima
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);

    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const menuItems = [
    { label: 'Sobre', id: 'sobre' },
    { label: 'Serviços', id: 'servicos' },
    { label: 'Projetos', id: 'projetos' },
    { label: 'Equipe', id: 'equipe' },
    { label: 'Cotação', id: 'cotacao' },
  ];

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`${poppins.variable} ${poppins.className} fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <LogoMinerstone width={180} height={50} priority />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-white hover:text-gold-accent transition-colors duration-300 font-medium text-[15px] tracking-wide"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-white hover:text-gold-accent transition-colors duration-300 font-medium text-[15px] tracking-wide"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Login
            </Link>
            <Link
              href={getAuthLink('/auth/register')}
              className="px-6 py-2.5 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-[15px] tracking-wide"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Registrar
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-slate-900/98 backdrop-blur-md"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left text-white hover:text-gold-accent transition-colors duration-300 font-medium py-2 text-[15px] tracking-wide"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 space-y-3 border-t border-white/10">
                <Link
                  href="/auth/login"
                  className="block w-full text-center py-2.5 text-white hover:text-gold-accent transition-colors duration-300 font-medium text-[15px] tracking-wide"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href={getAuthLink('/auth/register')}
                  className="block w-full text-center px-6 py-2.5 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 text-[15px] tracking-wide"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Registrar
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
