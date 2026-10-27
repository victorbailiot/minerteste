'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HoverScaleCardProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

const HoverScaleCard = ({
  children,
  className = '',
  scale = 1.05,
}: HoverScaleCardProps) => {
  return (
    <motion.div
      whileHover={{ scale }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`transition-shadow hover:shadow-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default HoverScaleCard;
