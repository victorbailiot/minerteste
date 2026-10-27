'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import ParallaxBackground from '@/components/ui/ParallaxBackground';

interface CtaSectionProps {
  getAuthLink?: (link: string) => string;
}

const CtaSection = ({ getAuthLink = (link) => link }: CtaSectionProps) => {
  return (
    <ParallaxBackground
      speed={0.9}
      imageUrl="/images/bg_parallax1.jpg"
      className="py-24"
      overlay={
        <div className="h-full w-full bg-gradient-to-br from-slate-900/95 via-copper-dark/90 to-slate-900/95" />
      }
    >
      {/* Content */}
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated Elements */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium">
              <span className="w-2 h-2 bg-gold-accent rounded-full animate-pulse" />
              <span>Junte-se à Revolução</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Pronto para Fazer Parte da{' '}
              <span className="bg-gradient-to-r from-copper-primary via-gold-accent to-copper-light bg-clip-text text-transparent">
                Revolução
              </span>
              ?
            </h2>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Comece sua jornada na mineração moderna hoje. Oportunidades únicas
              de investimento e fornecimento de minérios de alta qualidade.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={getAuthLink('/auth/register')}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold text-lg hover:shadow-2xl transition-all duration-300"
                >
                  Criar Conta
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <button
                  onClick={() => {
                    // Scroll to quotation form
                    const element = document.getElementById('cotacao');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold text-lg hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com Consultor
                </button>
              </motion.div>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-white mb-2">1.500+</p>
                <p className="text-white/70">Investidores</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-white mb-2">15.000+</p>
                <p className="text-white/70">Capacidade projetada (t/ano)</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-white mb-2">20+ Anos</p>
                <p className="text-white/70">de experiência da equipe</p>
              </motion.div>
            </div>

            <p className="text-sm text-white/70 pt-6">
              * Indicadores apresentados como projeções/metas para 2026.
            </p>
          </motion.div>
        </div>
      </div>
    </ParallaxBackground>
  );
};

export default CtaSection;
