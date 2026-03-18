import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = 'Chọn...', className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`custom-select-container ${className}`} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {selectedOption?.icon}
          <span style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: selectedOption ? 'inherit' : 'var(--text-muted)'
          }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={18} 
          style={{ 
            transition: 'transform 0.3s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
            opacity: 0.6
          }} 
        />
      </button>

      {isOpen && (
        <div className="animate-scale-in" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '6px',
          maxHeight: '350px',
          overflowY: 'auto',
          background: '#1e293b', // Darker, more solid background
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="select-option"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease-out',
                background: value === option.value ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: value === option.value ? '#a5b4fc' : 'var(--text-main)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  color: value === option.value ? 'var(--primary)' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: value === option.value ? 1 : 0.7
                }}>
                  {option.icon}
                </div>
                <span style={{ 
                  fontWeight: value === option.value ? 700 : 500,
                  fontSize: '0.9rem'
                }}>
                  {option.label}
                </span>
              </div>
              {value === option.value && <Check size={18} color="var(--primary)" />}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .custom-select-container .glass-input {
          padding-right: 12px;
          font-weight: 600;
          background: rgba(15, 23, 42, 0.8) !important;
        }
        .select-option:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: scale(1.02);
        }
        .animate-scale-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top center;
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
