'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Sparkles } from 'lucide-react';
import Link from 'next/link';

export interface FooterLinkProps {
  label: string;
  href: string;
}

export interface FooterSectionProps {
  companyName: string;
  description: string;
  companyLinks: FooterLinkProps[];
  partnerLinks: FooterLinkProps[];
  contactInfo: {
    address: string;
    phone: string;
    email: string;
  };
  socialLinks: FooterLinkProps[];
}

const FooterSection: FC<FooterSectionProps> = ({
  companyName,
  description,
  companyLinks,
  partnerLinks,
  contactInfo,
  socialLinks,
}) => {
  const getSocialIcon = (href: string) => {
    if (href.includes('facebook')) return <Facebook className="w-5 h-5" />;
    if (href.includes('twitter')) return <Twitter className="w-5 h-5" />;
    if (href.includes('instagram')) return <Instagram className="w-5 h-5" />;
    if (href.includes('linkedin')) return <Linkedin className="w-5 h-5" />;
    return null;
  };

  return (
    <footer className="relative bg-gradient-to-b from-black via-slate-900 to-black border-t border-white/20 py-16 px-4 md:px-8 lg:px-16 overflow-hidden">
      {/* Background dinâmico */}
      <div className="absolute inset-0 z-0">
        {/* Gradiente base dinâmico */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black" />
        
        {/* Efeito de luz superior sutil */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-400/3 via-orange-500/1 to-transparent" />
        
        {/* Overlay de brilho metálico sutil */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/1 via-transparent to-orange-500/1 mix-blend-soft-light pointer-events-none" />
        
        {/* Partículas metálicas sutis */}
        <div className="absolute inset-0 opacity-15">
          {[
            { left: '10%', top: '20%', size: 3, delay: 0, color: 'from-amber-400 to-orange-500' },
            { left: '85%', top: '15%', size: 4, delay: 2, color: 'from-orange-500 to-amber-400' },
            { left: '25%', top: '60%', size: 2, delay: 4, color: 'from-amber-400 to-orange-600' },
            { left: '75%', top: '70%', size: 3, delay: 6, color: 'from-orange-600 to-amber-500' },
            { left: '50%', top: '30%', size: 4, delay: 8, color: 'from-amber-500 to-orange-400' },
            { left: '15%', top: '80%', size: 3, delay: 10, color: 'from-orange-400 to-amber-600' }
          ].map((particle, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${particle.color} backdrop-blur-sm`}
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                filter: 'blur(0.5px)',
                opacity: 0.3 + (i % 2) * 0.2
              }}
              animate={{
                y: [0, -10 - (i % 2) * 3, 0],
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 15 + (i % 2) * 5,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Padrão geométrico refinado */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_#fbbf24_1px,_transparent_1px)] bg-[length:80px_80px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_#f59e0b_1px,_transparent_1px)] bg-[length:100px_100px]" />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Company Information */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600">
                  {companyName}
                </h3>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                {description}
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((link, index) => (
                <motion.a
                  key={index}
                  href={link.href}
                  className="text-white/50 hover:text-amber-400 transition-colors duration-300 p-2 rounded-lg hover:bg-white/5 backdrop-blur-sm border border-white/10 hover:border-amber-500/30"
                  aria-label={link.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {getSocialIcon(link.href)}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Company Links */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
              Empresa
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-amber-400 transition-colors duration-300 text-sm group relative"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Partner Links */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
              Parcerias
            </h4>
            <ul className="space-y-3">
              {partnerLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-amber-400 transition-colors duration-300 text-sm group relative"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Information */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
              Contato
            </h4>
            <div className="space-y-4">
              

              <div className="flex items-center space-x-3 group">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                  <Mail className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="text-white/60 hover:text-amber-400 transition-colors duration-300 text-sm"
                >
                  {contactInfo.email}
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div 
          className="border-t border-white/20 pt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-white/50 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
            </div>

            {/* Legal Links */}
            <div className="flex space-x-6">
              <Link
                href="/privacidade"
                className="text-white/50 hover:text-amber-400 transition-colors duration-300 text-sm group relative"
              >
                <span className="relative">
                  Política de Privacidade
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
                </span>
              </Link>
              <Link
                href="/termos"
                className="text-white/50 hover:text-amber-400 transition-colors duration-300 text-sm group relative"
              >
                <span className="relative">
                  Termos de Uso
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default FooterSection;