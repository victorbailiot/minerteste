'use client';

import { motion, useReducedMotion, AnimatePresence, Variants } from 'framer-motion';
import { FC, useEffect, useState, useRef } from 'react';
import { fadeInUp, staggerContainer, fadeIn, getReducedMotionVariants } from '@/lib/animations';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronDown, User, LogIn, Sparkles } from 'lucide-react';

export interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundImage: string;
  getAuthLink?: (baseLink: string) => string;
}

// Links de navegação para reutilização
const navLinks = [
  { href: "#about", label: "Sobre" },
  { href: "#why-join", label: "Por que fazer parte" },
  { href: "#impact", label: "Impacto" },
];

// Links de autenticação base
const baseAuthLinks = [
  { href: "/dashboard", label: "Login", icon: LogIn },
  { href: "/auth/register", label: "Cadastrar", icon: User },
];

const HeroSection: FC<HeroSectionProps> = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  backgroundImage = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80",
  getAuthLink,
}) => {
  // Verificar preferência de movimento reduzido
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);
  const authMenuRef = useRef<HTMLDivElement>(null);
  const activeNavRef = useRef<string | null>(null);
  const [authLinks, setAuthLinks] = useState(baseAuthLinks);

  // Gerar links de autenticação com parâmetro invite se necessário
  useEffect(() => {
    const newAuthLinks = baseAuthLinks.map(link => {
      const finalHref = getAuthLink ? getAuthLink(link.href) : link.href;
      return {
        ...link,
        href: finalHref
      };
    });
    setAuthLinks(newAuthLinks);
  }, [getAuthLink]);

  // Selecionar variantes de animação com base na preferência do usuário
  const animations = prefersReducedMotion ? getReducedMotionVariants() : {
    fadeInUp,
    staggerContainer,
    fadeIn
  };

  // Simular carregamento da página para garantir que as animações sejam executadas após o carregamento
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Fechar o menu mobile quando a tela for redimensionada para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  // Impedir rolagem quando o menu mobile estiver aberto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Fechar menu de autenticação ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authMenuRef.current && !authMenuRef.current.contains(event.target as Node)) {
        setAuthMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Atualizar seção ativa com base na rolagem
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollPosition = window.scrollY + 100;

      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        const sectionHeight = (section as HTMLElement).offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          activeNavRef.current = sectionId;
          // Forçar re-renderização (em uma aplicação real, usaríamos useState)
          const navItems = document.querySelectorAll(`[data-nav-link="${sectionId}"]`);
          navItems.forEach(item => {
            item.classList.add('text-amber-500');
            item.classList.remove('text-white/80');
          });
        } else {
          const navItems = document.querySelectorAll(`[data-nav-link="${sectionId}"]`);
          navItems.forEach(item => {
            item.classList.remove('text-amber-500');
            item.classList.add('text-white/80');
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Variantes de animação para o menu mobile
  const mobileMenuVariants: Variants = {
    closed: {
      opacity: 0,
      x: "100%",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      opacity: 1,
      x: "0%",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  // Variantes para os itens do menu mobile
  const mobileMenuItemVariants: Variants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 }
  };

  // Variantes para animações de botões
  const buttonVariants: Variants = {
    initial: {
      opacity: 0,
      y: 20
    },
    animate: (delay: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: delay * 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }),
    hover: {
      scale: 1.05,
      boxShadow: "0 20px 40px -10px rgba(245, 158, 11, 0.4)",
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    tap: {
      scale: 0.98,
      boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.3)",
      transition: {
        duration: 0.1
      }
    }
  };

  // Variantes para o menu de autenticação dropdown
  const authMenuVariants: Variants = {
    closed: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  // Variantes para os itens do menu de autenticação
  const authMenuItemVariants: Variants = {
    closed: { opacity: 0, y: -5 },
    open: { opacity: 1, y: 0 }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background dinâmico com gradientes e efeitos */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 1.5 }}
      >
        {/* Gradiente base dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-800" />

        {/* Background Image com overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            filter: 'brightness(0.3) contrast(1.2) saturate(1.1)'
          }}
        />

        {/* Gradiente metálico dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-slate-900/60 to-black/70" />

        {/* Efeito de luz superior com cores vibrantes */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/8 via-orange-500/4 to-transparent" />

        {/* Efeito de luz inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/6 via-amber-500/3 to-transparent" />

        {/* Overlay de brilho metálico dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/3 via-transparent to-orange-500/3 mix-blend-soft-light pointer-events-none" />

        {/* Mesh gradient dinâmico */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 via-transparent to-orange-600/10" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/8 via-transparent to-amber-400/8" />
        </div>

        {/* Partículas metálicas animadas */}
        <div className="absolute inset-0 opacity-40">
          {[
            { left: '10%', top: '20%', size: 8, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '85%', top: '15%', size: 12, delay: 0.5, color: 'from-orange-500 to-amber-400' },
            { left: '25%', top: '60%', size: 6, delay: 1, color: 'from-amber-400 to-orange-600' },
            { left: '75%', top: '70%', size: 10, delay: 1.5, color: 'from-orange-600 to-amber-500' },
            { left: '50%', top: '30%', size: 9, delay: 2, color: 'from-amber-500 to-orange-400' },
            { left: '15%', top: '80%', size: 7, delay: 2.5, color: 'from-orange-400 to-amber-600' },
            { left: '90%', top: '50%', size: 11, delay: 3, color: 'from-amber-600 to-orange-500' },
            { left: '40%', top: '85%', size: 8, delay: 3.5, color: 'from-orange-500 to-amber-400' },
            { left: '65%', top: '25%', size: 13, delay: 4, color: 'from-amber-400 to-orange-600' },
            { left: '30%', top: '45%', size: 6, delay: 4.5, color: 'from-orange-600 to-amber-500' },
            { left: '80%', top: '75%', size: 9, delay: 5, color: 'from-amber-500 to-orange-400' },
            { left: '5%', top: '55%', size: 10, delay: 5.5, color: 'from-orange-400 to-amber-600' },
            { left: '95%', top: '35%', size: 7, delay: 6, color: 'from-amber-600 to-orange-500' },
            { left: '20%', top: '10%', size: 12, delay: 6.5, color: 'from-orange-500 to-amber-400' },
            { left: '70%', top: '90%', size: 8, delay: 7, color: 'from-amber-400 to-orange-600' },
            { left: '45%', top: '5%', size: 11, delay: 7.5, color: 'from-orange-600 to-amber-500' },
            { left: '55%', top: '65%', size: 9, delay: 8, color: 'from-amber-500 to-orange-400' },
            { left: '35%', top: '95%', size: 6, delay: 8.5, color: 'from-orange-400 to-amber-600' },
            { left: '60%', top: '40%', size: 10, delay: 9, color: 'from-amber-600 to-orange-500' },
            { left: '25%', top: '75%', size: 8, delay: 9.5, color: 'from-orange-500 to-amber-400' }
          ].map((particle, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${particle.color} shadow-lg backdrop-blur-sm`}
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                zIndex: 10,
                opacity: 0.7 + (i % 3) * 0.1
              }}
              animate={{
                y: [0, -30 - (i % 3) * 8, 0],
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 6 + (i % 3) * 2,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Padrão geométrico refinado */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>

        {/* Efeito de profundidade dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-transparent" />

        {/* Linhas de energia sutis */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scaleX: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scaleX: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: 2,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      {/* Navigation Header com glassmorphism */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 px-4 py-6 md:px-8 lg:px-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center justify-between">
          {/* Logo com efeito glow */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Link
              href="/"
              className="relative text-white font-bold text-xl md:text-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black rounded-md"
              aria-label="TectonMiner - Página inicial"
            >
              <Image
                  src="/images/logo-minerstone-branco.png"
                  alt="TectonMiner Logo"
                  width={200}
                  height={200}
                  className="object-contain relative z-10"
                  priority
                />
            </Link>
          </motion.div>

          {/* Desktop Navigation com glassmorphism */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <motion.div
                key={link.href}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={link.href}
                  className="text-white/80 hover:text-white transition-colors relative group px-3 py-2 rounded-lg hover:bg-white/5 backdrop-blur-sm"
                  aria-label={link.label}
                  data-nav-link={link.href.replace('#', '')}
                >
                  {link.label}
                  <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                </Link>
              </motion.div>
            ))}

            {/* Auth Menu Dropdown com glassmorphism */}
            <div className="relative" ref={authMenuRef}>
              <motion.button
                className="flex items-center space-x-1 text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black"
                onClick={() => setAuthMenuOpen(!authMenuOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-expanded={authMenuOpen}
                aria-label="Menu de autenticação"
              >
                <span>Conta</span>
                <motion.div
                  animate={{ rotate: authMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={16} />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {authMenuOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={authMenuVariants}
                  >
                    {authLinks.map((link) => (
                      <motion.div key={link.href} variants={authMenuItemVariants}>
                        <Link
                          href={link.href}
                          className="flex items-center space-x-2 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          onClick={() => setAuthMenuOpen(false)}
                        >
                          <link.icon size={16} />
                          <span>{link.label}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden text-white p-2 z-50 rounded-lg hover:bg-white/10 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Menu com glassmorphism */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-black/40 z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />

            <motion.nav className="flex flex-col items-center space-y-8 z-10 w-full px-8">
              {/* Logo no menu mobile */}
              <motion.div
                className="text-white font-bold text-3xl mb-8"
                variants={mobileMenuItemVariants}
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-600">
                  <Image
                    src="/images/simbolo-minerstone.png"
                    alt="TectonMiner Logo"
                    width={150}
                    height={150}
                    className="object-contain relative z-10"
                    priority
                  />
                </span>
              </motion.div>

              {/* Links de navegação */}
              {navLinks.map((link) => (
                <motion.div
                  key={link.href}
                  variants={mobileMenuItemVariants}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full"
                >
                  <Link
                    href={link.href}
                    className="text-white text-2xl font-medium hover:text-amber-500 transition-colors px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-black inline-block w-full text-center relative overflow-hidden group backdrop-blur-sm hover:bg-white/5"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={link.label}
                    data-nav-link={link.href.replace('#', '')}
                  >
                    <span className="relative z-10">{link.label}</span>
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                  </Link>
                </motion.div>
              ))}

              {/* Links de autenticação */}
              <motion.div className="w-full pt-4 border-t border-white/20" variants={mobileMenuItemVariants}>
                <div className="flex flex-col space-y-4">
                  {authLinks.map((link) => (
                    <motion.div
                      key={link.href}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        href={link.href}
                        className="flex items-center justify-center space-x-2 text-white/80 hover:text-white text-xl font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label={link.label}
                      >
                        <link.icon size={20} />
                        <span>{link.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Content */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center px-4 md:px-8 lg:px-12 pt-20">
        <motion.div
          className="max-w-6xl mx-auto text-center"
          variants={animations.staggerContainer}
          initial="initial"
          animate={isLoaded ? "animate" : "initial"}
        >
          {/* Logo com efeito glow */}
          <motion.div
            className="mb-8 flex justify-center hidden md:flex"
            variants={animations.fadeInUp}
            custom={0}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full blur-2xl opacity-30 animate-pulse" />
              <Image
                src="/images/simbolo-minerstone.png"
                alt="TectonMiner Logo"
                width={150}
                height={150}
                className="object-contain relative z-10"
                priority
              />
            </div>
          </motion.div>

          {/* Badge decorativo 
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur-sm mb-8"
            variants={animations.fadeInUp}
            custom={0.5}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Inovação em Mineração</span>
          </motion.div>*/}

          <motion.h1
            className="text-5xl md:text-6xl lg:text-7xl xl:text-7xl font-bold text-white mb-8 leading-tight"
            variants={animations.fadeInUp}
            custom={1}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-100 to-white">
              {title}
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl lg:text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            variants={animations.fadeInUp}
            custom={2}
          >
            {subtitle}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-32"
            variants={animations.staggerContainer}
          >
            <motion.div
              variants={buttonVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              whileTap="tap"
              custom={3}
            >
              <Link
                href={ctaLink}
                className="px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg md:text-xl rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 text-center min-w-[220px] inline-block relative overflow-hidden group shadow-2xl shadow-amber-500/30 backdrop-blur-sm"
                aria-label={ctaText}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {ctaText}
                  <Sparkles className="w-5 h-5" />
                </span>
                <motion.span
                  className="absolute inset-0 bg-white/20"
                  initial={{ x: '-100%', opacity: 0 }}
                  whileHover={{ x: '100%', opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 w-full h-1 bg-white/40"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>

            {secondaryCtaText && secondaryCtaLink && (
              <motion.div
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                custom={4}
              >
                <Link
                  href={secondaryCtaLink}
                  className="px-12 py-5 bg-transparent border-2 border-white/30 text-white font-bold text-lg md:text-xl rounded-2xl hover:border-amber-500/50 hover:bg-white/5 transition-all duration-300 text-center min-w-[220px] inline-block relative overflow-hidden group backdrop-blur-sm"
                  aria-label={secondaryCtaText}
                >
                  <span className="relative z-10">{secondaryCtaText}</span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-600/10"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.span
                    className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Indicador de rolagem removido conforme solicitação */}
    </section>
  );
};

export default HeroSection;