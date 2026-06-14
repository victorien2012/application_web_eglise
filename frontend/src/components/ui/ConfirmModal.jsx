import React from 'react';
import { X } from 'lucide-react';
import './ConfirmModal.css';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant = 'primary', icon: Icon }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="modal-header">
          {Icon && (
            <div className={`modal-icon modal-icon-${variant}`}>
              <Icon size={24} />
            </div>
          )}
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          <p>{message}</p>
        </div>
        
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            {cancelText || 'Annuler'}
          </button>
          <button className={`modal-btn modal-btn-${variant}`} onClick={() => {
            onConfirm();
            onClose();
          }}>
            {confirmText || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
