import React from 'react';
import { IconBaseProps } from 'react-icons';

interface IconProps extends IconBaseProps {
  icon: React.ComponentType<IconBaseProps>;
}

export const Icon: React.FC<IconProps> = ({ 
  icon: IconComponent, 
  size = "1.5em", 
  className = "", 
  ...props 
}) => {
  return (
    <IconComponent
      size={size}
      className={`inline-block ${className}`}
      {...props}
    />
  );
}; 