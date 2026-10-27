'use client';

import { Award, MapPin, TrendingUp, Users } from 'lucide-react';
import CountUp from '@/components/ui/CountUp';
import ParallaxBackground from '@/components/ui/ParallaxBackground';
import AnimatedSection from '@/components/ui/AnimatedSection';

const StatsCounter = () => {
  const stats = [
    {
      icon: Award,
      value: 15000,
      label: 'Capacidade projetada (t/ano)',
      suffix: '+',
    },
    {
      icon: Users,
      value: 1500,
      label: 'Investidores',
      suffix: '+',
    },
    {
      icon: MapPin,
      value: 8,
      label: 'Projetos mapeados',
      suffix: '+',
    },
    {
      icon: TrendingUp,
      value: 45,
      label: 'Crescimento projetado (2026)',
      suffix: '%',
    },
  ];

  return (
    <ParallaxBackground
      speed={0.5}
      imageUrl="https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80"
      className="py-20"
      overlay={
        <div className="h-full w-full bg-gradient-to-br from-slate-900/95 via-copper-dark/90 to-slate-900/95" />
      }
    >
      <div className="container mx-auto px-4">
        <AnimatedSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:bg-white/10 hover:border-copper-primary/50 transition-all duration-300"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-copper-primary/20 to-gold-accent/20 rounded-xl">
                    <Icon className="w-8 h-8 text-gold-accent" />
                  </div>
                </div>

                <div className="text-5xl font-bold text-white mb-2">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>

                <div className="text-gray-300 font-medium">{stat.label}</div>
              </div>
            );
          })}
        </AnimatedSection>
        <p className="text-center text-sm text-white/70 mt-8">
          * Indicadores exibidos como projeções/metas para 2026.
        </p>
      </div>
    </ParallaxBackground>
  );
};

export default StatsCounter;
