'use client';

import { motion } from 'framer-motion';
import {
  Cpu,
  Shield,
  Leaf,
  TrendingUp,
  Users,
  Headphones,
  Award,
  Lock,
  Target,
} from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';

const WhyChooseUs = () => {
  const reasons = [
    {
      icon: Cpu,
      title: 'Tecnologia de Ponta',
      description: 'Tecnologia e processos planejados para extração e beneficiamento',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Leaf,
      title: 'Sustentabilidade',
      description: 'Práticas responsáveis com metas de mitigação e conformidade ambiental',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Transparência',
      description: 'Relatórios claros e governança com auditorias conforme evolução do projeto',
      gradient: 'from-copper-primary to-gold-accent',
    },
    {
      icon: TrendingUp,
      title: 'Crescimento Projetado',
      description: 'Metas e indicadores públicos (projeções) para acompanhar 2026',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Gestão Profissional',
      description: 'Equipe experiente com foco em execução e melhoria contínua',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Headphones,
      title: 'Suporte Dedicado',
      description: 'Atendimento dedicado por canais oficiais e horário estendido',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Award,
      title: 'Certificações',
      description: 'Compromisso com boas práticas e trilha de certificações (em evolução)',
      gradient: 'from-yellow-500 to-amber-500',
    },
    {
      icon: Lock,
      title: 'Segurança Jurídica',
      description: 'Contratos registrados e respaldo legal completo',
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      icon: Target,
      title: 'Execução por Etapas',
      description: 'Roadmap, marcos e metas para 2026 com acompanhamento contínuo',
      gradient: 'from-rose-500 to-red-600',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
            <Award className="w-4 h-4" />
            <span>Por Que Escolher</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Por Que{' '}
            <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
              MinerStone
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            Combinamos tecnologia, sustentabilidade e expertise para entregar
            uma operação eficiente e responsável, com metas e transparência.
          </p>
        </AnimatedSection>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <div className="bg-gradient-to-br from-slate-50 to-white border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-all duration-300 h-full">
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${reason.gradient} transform group-hover:rotate-6 transition-transform duration-300`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {reason.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
