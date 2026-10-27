'use client';

import { motion } from 'framer-motion';
import { Pickaxe, TrendingUp, Package, Lightbulb, ArrowRight } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import HoverScaleCard from '@/components/ui/HoverScaleCard';

const ServicesGrid = () => {
  const services = [
    {
      icon: Pickaxe,
      title: 'Mineração de Cobre',
      description:
        'Implantação de operações de cobre com tecnologia e foco em boas práticas ambientais.',
      color: 'from-copper-primary to-copper-light',
    },
    {
      icon: TrendingUp,
      title: 'Investimento Colaborativo',
      description:
        'Sistema unilevel com transparência e acompanhamento de marcos e metas do projeto.',
      color: 'from-gold-accent to-gold-light',
    },
    {
      icon: Package,
      title: 'Fornecimento B2B',
      description:
        'Fornecimento B2B com especificação de qualidade e entrega conforme cronograma.',
      color: 'from-copper-dark to-copper-primary',
    },
  ];

  return (
    <section id="servicos" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
            <Package className="w-4 h-4" />
            <span>Nossos Serviços</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Serviços de{' '}
            <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
              Qualidade
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            Oferecemos soluções completas em mineração, desde a extração até o
            investimento colaborativo e consultoria especializada.
          </p>
        </AnimatedSection>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <HoverScaleCard className="h-full bg-white rounded-xl p-6 border border-gray-200">
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={`inline-flex p-4 rounded-lg bg-gradient-to-br ${service.color}`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {service.title}
                  </h3>

                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Link */}
                  <motion.button
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-2 text-copper-primary font-semibold hover:text-gold-accent transition-colors duration-300"
                  >
                    Saiba Mais
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </HoverScaleCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
