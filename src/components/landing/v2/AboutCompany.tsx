'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Award, TrendingUp, Users, Phone } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import CountUp from '@/components/ui/CountUp';

const AboutCompany = () => {
  const stats = [
    { value: 20, suffix: '+', label: 'Experiência da equipe (anos)' },
    { value: 15000, suffix: '+', label: 'Capacidade projetada (t/ano • 2026)' },
    { value: 1500, suffix: '+', label: 'Investidores' },
  ];

  return (
    <section id="sobre" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left - Images */}
          <AnimatedSection direction="left" className="relative">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80"
                alt="Mineração MinerStone"
                fill
                className="object-cover"
              />
              {/* Overlay Badge */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-copper-primary to-gold-accent rounded-lg">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Consulta Gratuita
                    </p>
                    <p className="text-xl font-bold text-copper-dark">
                      +55 11 9999-9999
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Experience Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute -top-6 -right-6 bg-gradient-to-br from-copper-primary to-gold-accent text-white rounded-2xl p-6 shadow-2xl"
            >
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">10+</div>
                <div className="text-sm">Anos de</div>
                <div className="text-sm font-semibold">Experiência</div>
              </div>
            </motion.div>
          </AnimatedSection>

          {/* Right - Content */}
          <AnimatedSection direction="right">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
              <Award className="w-4 h-4" />
              <span>Sobre a MinerStone</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Construindo uma Mineração{' '}
              <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
                Sustentável
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Somos mais do que uma mineradora. Conectamos pessoas à riqueza
              mineral de forma justa, inteligente e sustentável. Nossa missão é
              revolucionar a indústria de mineração através da tecnologia e
              colaboração.
            </p>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Estamos na fase de implantação das operações e estruturação de
              fornecimento. As capacidades e metas desta página são projeções
              para 2026, alinhadas ao plano de expansão e execução.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-copper-dark mb-1">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mb-8">
              * Indicadores exibidos como projeções/metas para 2026.
            </p>

            {/* CTA Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-copper-primary to-gold-accent text-white rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              Conheça Nossa História
              <TrendingUp className="w-5 h-5" />
            </motion.button>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default AboutCompany;
