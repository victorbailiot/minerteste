'use client';

import { motion } from 'framer-motion';
import { FC, ReactNode } from 'react';
import { cardAnimation } from '@/lib/animations';

export interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedCard: FC<AnimatedCardProps> = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      className={`bg-black/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 ${className}`}
      variants={cardAnimation}
      custom={delay}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;