'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Pickaxe, TrendingUp, Users } from 'lucide-react';
import CountUp from '@/components/ui/CountUp';

interface HeroSectionV2Props {
  getAuthLink?: (link: string) => string;
}

const HeroSectionV2 = ({ getAuthLink = (link) => link }: HeroSectionV2Props) => {
  const stats = [
    { icon: Pickaxe, value: 15000, suffix: '+', label: 'Capacidade projetada (t/ano)' },
    { icon: Users, value: 1500, suffix: '+', label: 'Investidores' },
    { icon: TrendingUp, value: 45, suffix: '%', label: 'Crescimento projetado' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-copper-dark">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage:
              'url(/images/miner_bg1.jpeg)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-copper-dark/80 to-slate-900/90" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gold-accent rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/20 border border-copper-primary/30 rounded-full text-gold-accent text-sm font-medium mb-6"
          >
            <Pickaxe className="w-4 h-4" />
            <span>Mineração Sustentável de Cobre</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Construindo o Futuro </span>
            <br />
            <span className="bg-gradient-to-r from-copper-primary via-gold-accent to-copper-light bg-clip-text text-transparent">
              com Cobre
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto"
          >
            Tecnologia, inteligência coletiva e construção de uma operação de mineração
            sustentável. Acompanhe a implantação e participe do crescimento em 2026.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link
              href={getAuthLink('/auth/register')}
              className="group px-8 py-4 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Quero Investir
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => {
                const element = document.getElementById('cotacao');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white rounded-lg font-semibold text-lg hover:bg-white/20 hover:border-gold-accent transition-all duration-300"
            >
              Solicitar Cotação
            </button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-copper-primary/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 bg-gradient-to-br from-copper-primary/20 to-gold-accent/20 rounded-lg">
                      <Icon className="w-6 h-6 text-gold-accent" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>

          <p className="text-sm text-white/70 mt-6">
            * Números apresentados como projeções/metas para 2026.
          </p>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-1.5 bg-gold-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSectionV2;
