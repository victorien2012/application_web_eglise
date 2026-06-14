import React from 'react';
import { Link } from 'react-router-dom';
import './Button.css';

export function Button({ 
  children, 
  to, 
  variant = 'primary', 
  className = '', 
  icon: Icon,
  iconPosition = 'left',
  ...props 
}) {
  const baseClassName = `premium-btn btn-${variant} ${className}`.trim();

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon size={16} className="btn-icon-svg" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={16} className="btn-icon-svg" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={baseClassName} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={baseClassName} {...props}>
      {content}
    </button>
  );
}
