'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Image from 'next/image';

const TestimonialsSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      name: 'João Santos',
      company: 'Indústria Metalúrgica Santos Ltda',
      image: 'https://i.pravatar.cc/400?img=11',
      rating: 5,
      text: 'Estamos acompanhando a implantação da MinerStone e acreditamos no potencial do projeto. Nosso foco é estabelecer uma parceria sólida para 2026, com qualidade e previsibilidade.',
    },
    {
      name: 'Maria Oliveira',
      company: 'Tech Solutions Brasil',
      image: 'https://i.pravatar.cc/400?img=47',
      rating: 5,
      text: 'O que mais me atrai é a proposta de transparência e governança. Quero acompanhar de perto a evolução do projeto e os marcos previstos para 2026.',
    },
    {
      name: 'Carlos Mendes',
      company: 'Construções Premium',
      image: 'https://i.pravatar.cc/400?img=15',
      rating: 5,
      text: 'Buscamos um fornecedor com planejamento claro de capacidade e cronograma. A proposta da MinerStone para 2026 nos parece alinhada com o que precisamos.',
    },
    {
      name: 'Ana Paula Costa',
      company: 'Investidora Individual',
      image: 'https://i.pravatar.cc/400?img=48',
      rating: 5,
      text: 'Gosto de projetos com comunicação objetiva e metas bem definidas. Estou interessada em acompanhar as atualizações e a evolução da operação ao longo de 2026.',
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  const handlePrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
            <Quote className="w-4 h-4" />
            <span>Depoimentos</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            O Que Dizem Nossos{' '}
            <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
              Parceiros
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            Depoimentos sobre expectativas e visão de crescimento para 2026.
          </p>
        </AnimatedSection>

        {/* Slider */}
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl p-8 md:p-12 shadow-xl"
              >
                {/* Quote Icon */}
                <div className="mb-6">
                  <div className="inline-flex p-4 bg-gradient-to-br from-copper-primary/10 to-gold-accent/10 rounded-2xl">
                    <Quote className="w-8 h-8 text-copper-primary" />
                  </div>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-gold-accent text-gold-accent"
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-8">
                  &ldquo;{currentTestimonial.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden">
                    <Image
                      src={currentTestimonial.image}
                      alt={currentTestimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">
                      {currentTestimonial.name}
                    </p>
                    <p className="text-gray-600">{currentTestimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={handlePrevious}
                className="p-3 bg-white hover:bg-copper-primary hover:text-white border border-gray-200 rounded-full transition-all duration-300 shadow-md hover:shadow-xl"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNext}
                className="p-3 bg-white hover:bg-copper-primary hover:text-white border border-gray-200 rounded-full transition-all duration-300 shadow-md hover:shadow-xl"
                aria-label="Próximo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setCurrentIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-copper-primary'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Ir para depoimento ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSlider;
