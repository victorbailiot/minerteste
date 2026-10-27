'use client';

import Image from 'next/image';

interface LogoMinerstoneProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  priority?: boolean;
}

const LogoMinerstone = ({
  width = 200,
  height,
  className = '',
  priority = false,
}: LogoMinerstoneProps) => {
  // Converte width e height para números se forem strings
  const widthNum = typeof width === 'number' ? width : parseInt(width, 10) || 200;
  const heightNum = height
    ? typeof height === 'number'
      ? height
      : parseInt(height, 10) || undefined
    : undefined;

  return (
    <Image
      src="/images/logo-minerstone-branco.png"
      alt="Minerstone Metal - Logo"
      width={widthNum}
      height={heightNum || widthNum * 0.3} // Mantém proporção se height não for fornecido
      className={className}
      style={{
        width: typeof width === 'string' ? width : undefined,
        height: height ? (typeof height === 'string' ? height : undefined) : 'auto',
      }}
      priority={priority}
      quality={100}
    />
  );
};

export default LogoMinerstone;
