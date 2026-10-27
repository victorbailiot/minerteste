'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, ArrowRight, Filter } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import HoverScaleCard from '@/components/ui/HoverScaleCard';

type ProjectCategory = 'Todas' | 'Em Implantação' | 'Em Desenvolvimento' | 'Planejado';

const ProjectsGallery = () => {
  const [activeFilter, setActiveFilter] = useState<ProjectCategory>('Todas');

  const projects = [
    {
      id: 1,
      title: 'Mina Serra Grande',
      category: 'Em Implantação' as ProjectCategory,
      location: 'Minas Gerais, Brasil',
      description: 'Frente de implantação com capacidade projetada de 5.000 t/ano (2026)',
      image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      title: 'Projeto Cerrado',
      category: 'Em Desenvolvimento' as ProjectCategory,
      location: 'Goiás, Brasil',
      description: 'Projeto em fase de licenciamento com potencial projetado de 3.000 t/ano (2026)',
      image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      title: 'Complexo Vale do Ouro',
      category: 'Em Implantação' as ProjectCategory,
      location: 'Bahia, Brasil',
      description: 'Complexo em implantação com foco em cobre e minérios associados',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80',
    },
    {
      id: 4,
      title: 'Mina Horizonte',
      category: 'Planejado' as ProjectCategory,
      location: 'São Paulo, Brasil',
      description: 'Projeto piloto planejado com meta operacional de 2.000 t/ano (2026)',
      image: 'https://images.unsplash.com/photo-1553484771-371a605b060b?auto=format&fit=crop&q=80',
    },
    {
      id: 5,
      title: 'Projeto Pantanal Verde',
      category: 'Em Desenvolvimento' as ProjectCategory,
      location: 'Mato Grosso, Brasil',
      description: 'Foco em mineração sustentável com metas de mitigação ambiental',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80',
    },
    {
      id: 6,
      title: 'Complexo Nordeste',
      category: 'Em Implantação' as ProjectCategory,
      location: 'Ceará, Brasil',
      description: 'Operação em implantação com tecnologia planejada de ponta',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80',
    },
  ];

  const categories: ProjectCategory[] = ['Todas', 'Em Implantação', 'Em Desenvolvimento', 'Planejado'];

  const filteredProjects =
    activeFilter === 'Todas'
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  const getCategoryColor = (category: ProjectCategory) => {
    switch (category) {
      case 'Em Implantação':
        return 'bg-green-500';
      case 'Em Desenvolvimento':
        return 'bg-yellow-500';
      case 'Planejado':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <section id="projetos" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
            <Filter className="w-4 h-4" />
            <span>Nossos Projetos</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Projetos{' '}
            <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
              e Expansão (2026)
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            Conheça frentes e projetos em implantação, desenvolvimento e planejamento.
            Capacidades e metas desta seção são projeções para 2026.
          </p>
        </AnimatedSection>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeFilter === category
                  ? 'bg-gradient-to-r from-copper-primary to-gold-accent text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-slate-50 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              layout
            >
              <HoverScaleCard className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 h-full">
                {/* Image */}
                <div className="relative h-64 overflow-hidden group">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`px-3 py-1 ${getCategoryColor(
                        project.category
                      )} text-white text-xs font-semibold rounded-full`}
                    >
                      {project.category}
                    </span>
                  </div>
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <button className="flex items-center gap-2 text-white font-semibold">
                      Ver Detalhes
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {project.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </HoverScaleCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsGallery;
