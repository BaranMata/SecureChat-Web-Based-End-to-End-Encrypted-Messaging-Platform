// src/components/Modal.tsx
import React from 'react';

interface ModalProps {
  isOpen: boolean;            // Pencere açık mı?
  onClose: () => void;        // Kapatma fonksiyonu
  title: string;              // Pencere başlığı
  children: React.ReactNode;  // İçine ne koyarsak o (Input, resim, yazı vs.)
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null; // Kapalıysa hiçbir şey render etme

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* İçeriğe tıklayınca kapanmasın diye stopPropagation yapıyoruz */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;