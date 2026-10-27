'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Linkedin, Mail, Phone, Users } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';

const TeamGrid = () => {
  const team = [
    {
      name: 'Carlos Silva',
      role: 'CEO & Fundador',
      specialty: 'Engenharia de Minas',
      image: 'https://i.pravatar.cc/400?img=12',
      bio: 'Mais de 20 anos de experiência em mineração sustentável',
      phone: '+55 11 98765-4321',
      email: 'carlos.silva@minerstone.com',
      linkedin: '#',
    },
    {
      name: 'Ana Rodrigues',
      role: 'Diretora de Operações',
      specialty: 'Gestão de Projetos',
      image: 'https://i.pravatar.cc/400?img=5',
      bio: 'Especialista em otimização de processos minerais',
      phone: '+55 11 98765-4322',
      email: 'ana.rodrigues@minerstone.com',
      linkedin: '#',
    },
    {
      name: 'Roberto Mendes',
      role: 'Diretor Técnico',
      specialty: 'Geologia Aplicada',
      image: 'https://i.pravatar.cc/400?img=33',
      bio: 'PhD em Geologia com foco em jazidas de cobre',
      phone: '+55 11 98765-4323',
      email: 'roberto.mendes@minerstone.com',
      linkedin: '#',
    },
    {
      name: 'Marina Costa',
      role: 'Diretora de Sustentabilidade',
      specialty: 'Meio Ambiente',
      image: 'https://i.pravatar.cc/400?img=9',
      bio: 'Pioneira em mineração verde e impacto zero',
      phone: '+55 11 98765-4324',
      email: 'marina.costa@minerstone.com',
      linkedin: '#',
    },
  ];

  return (
    <section id="equipe" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-copper-primary/10 border border-copper-primary/20 rounded-full text-copper-primary text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            <span>Nossa Equipe</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Conheça os{' '}
            <span className="bg-gradient-to-r from-copper-primary to-gold-accent bg-clip-text text-transparent">
              Especialistas
            </span>
          </h2>

          <p className="text-lg text-gray-600">
            Time experiente e qualificado, dedicado a revolucionar a indústria de
            mineração com inovação e sustentabilidade.
          </p>
        </AnimatedSection>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                {/* Image */}
                <div className="relative h-80 overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Overlay with Bio */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <p className="text-white text-sm mb-4">{member.bio}</p>
                    {/* Social Icons */}
                    <div className="flex gap-3">
                      <motion.a
                        whileHover={{ scale: 1.1 }}
                        href={`mailto:${member.email}`}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-copper-primary transition-colors duration-300"
                      >
                        <Mail className="w-4 h-4 text-white" />
                      </motion.a>
                      <motion.a
                        whileHover={{ scale: 1.1 }}
                        href={`tel:${member.phone}`}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-copper-primary transition-colors duration-300"
                      >
                        <Phone className="w-4 h-4 text-white" />
                      </motion.a>
                      <motion.a
                        whileHover={{ scale: 1.1 }}
                        href={member.linkedin}
                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-copper-primary transition-colors duration-300"
                      >
                        <Linkedin className="w-4 h-4 text-white" />
                      </motion.a>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-copper-primary font-semibold mb-2">
                    {member.role}
                  </p>
                  <p className="text-sm text-gray-600">{member.specialty}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamGrid;
