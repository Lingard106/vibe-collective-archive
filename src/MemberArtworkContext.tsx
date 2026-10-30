import {createContext, type ReactNode} from 'react';
import type {MemberProfile} from './data';

// Optional local review override; production enables the Lingard portrait only.
export type MemberArtworkRenderer = (member: MemberProfile, surface: 'background' | 'cover') => ReactNode;
export const MemberArtworkContext = createContext<MemberArtworkRenderer | null>(null);
