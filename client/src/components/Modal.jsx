import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({open,onClose,title,children}){
  const ref=useRef(null);
  useEffect(()=>{if(open&&!ref.current.open)ref.current.showModal();if(!open&&ref.current.open)ref.current.close();},[open]);
  return <dialog className="modal" ref={ref} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}} aria-labelledby="modal-title"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X/></button></div>{children}</dialog>;
}
