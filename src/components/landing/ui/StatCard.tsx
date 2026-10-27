'use client';

import { FC } from 'react';
import { motion, Variants } from 'framer-motion';
import { StatItem } from '@/types/landing';

interface StatCardProps extends StatItem {
  index?: number;
  className?: string;
}

const StatCard: FC<StatCardProps> = ({
  value,
  label,
  index = 0,
  className = ''
}) => {
  // Variantes de animação para o card
  const cardVariants: Variants = {
    initial: { 
      opacity: 0, 
      y: 30,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1],
        delay: 0.1 + (index * 0.1)
      }
    },
    hover: {
      y: -5,
      scale: 1.02,
      boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.15)",
      borderColor: "rgba(245, 158, 11, 0.3)",
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  // Variantes de animação para o valor
  const valueVariants: Variants = {
    initial: { 
      opacity: 0, 
      scale: 0.8 
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 0.2 + (index * 0.1)
      }
    }
  };

  // Variantes de animação para o rótulo
  const labelVariants: Variants = {
    initial: { 
      opacity: 0 
    },
    animate: { 
      opacity: 1,
      transition: {
        duration: 0.5,
        delay: 0.3 + (index * 0.1)
      }
    }
  };

  return (
    <motion.div
      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 ${className}`}
      variants={cardVariants}
      initial="initial"
      whileInView="animate"
      whileHover="hover"
      viewport={{ once: true, margin: "-50px" }}
    >
      <motion.span 
        className="block text-3xl md:text-4xl font-bold text-amber-500 mb-2"
        variants={valueVariants}
      >
        {value}
      </motion.span>
      <motion.span 
        className="block text-sm text-white/70"
        variants={labelVariants}
      >
        {label}
      </motion.span>
      
      {/* Efeito de brilho no hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-orange-600/5 rounded-lg opacity-0"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

export default StatCard;