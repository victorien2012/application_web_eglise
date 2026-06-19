import React from 'react';
import { FileArchive, FileImage, FileAudio, FileVideo, File } from 'lucide-react';

const LOGOS = {
  pdf: 'https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg',
  word: 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg',
  excel: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg',
  ppt: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg',
};

export function getFileInfo(url) {
  if (!url) return { type: 'unknown', Icon: File, color: '#64748b', bg: '#f1f5f9' };
  
  const extension = url.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return { type: 'logo', src: LOGOS.pdf };
    case 'doc':
    case 'docx':
      return { type: 'logo', src: LOGOS.word };
    case 'xls':
    case 'xlsx':
    case 'csv':
      return { type: 'logo', src: LOGOS.excel };
    case 'ppt':
    case 'pptx':
      return { type: 'logo', src: LOGOS.ppt };
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return { type: 'icon', Icon: FileArchive, color: '#8b5cf6', bg: '#f5f3ff' };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return { type: 'icon', Icon: FileImage, color: '#ec4899', bg: '#fdf2f8' };
    case 'mp3':
    case 'wav':
    case 'ogg':
      return { type: 'icon', Icon: FileAudio, color: '#06b6d4', bg: '#ecfeff' };
    case 'mp4':
    case 'webm':
    case 'avi':
    case 'mkv':
      return { type: 'icon', Icon: FileVideo, color: '#14b8a6', bg: '#f0fdfa' };
    case 'txt':
    default:
      return { type: 'icon', Icon: File, color: '#64748b', bg: '#f1f5f9' };
  }
}

export function DocumentIcon({ url, size = 20, className = '' }) {
  const info = getFileInfo(url);
  
  if (info.type === 'logo') {
    return (
      <img 
        src={info.src} 
        alt="File Logo" 
        className={className}
        style={{ width: `${size * 1.5}px`, height: `${size * 1.5}px`, objectFit: 'contain' }}
      />
    );
  }
  
  const { Icon, color, bg } = info;
  
  return (
    <div 
      className={`document-icon-wrapper ${className}`} 
      style={{ 
        width: `${size * 2}px`, 
        height: `${size * 2}px`, 
        backgroundColor: bg, 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Icon size={size} color={color} />
    </div>
  );
}
