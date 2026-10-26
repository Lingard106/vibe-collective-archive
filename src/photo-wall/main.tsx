import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import PhotoWall from './PhotoWall';
import './photo-wall.css';
import './preview-base.css';

createRoot(document.getElementById('preview-root')!).render(<StrictMode><PhotoWall/></StrictMode>);
