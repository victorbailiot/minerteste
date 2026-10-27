'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'copper' | 'gold' | 'copper-gold';
}

const gradients = {
  copper: 'from-copper-dark via-copper-primary to-copper-light',
  gold: 'from-gold-accent via-gold-light to-gold-accent',
  'copper-gold': 'from-copper-primary via-gold-accent to-copper-light',
};

const GradientCard = ({
  children,
  className = '',
  hover = true,
  gradient = 'copper-gold',
}: GradientCardProps) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.05 } : {}}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br ${gradients[gradient]} rounded-lg shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GradientCard;
