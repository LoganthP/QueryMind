export type PaletteName = 'Accent' | 'Blue' | 'Green' | 'Coral' | 'Gray';

export const PALETTES: Record<PaletteName, string[]> = {
  Accent: ['#6B66FF', '#A5A2FF', '#4740CC', '#CBC9FF', '#2D27A8', '#EEEDFE', '#8B87E8', '#3C3489'],
  Blue:   ['#378ADD', '#185FA5', '#85B7EB', '#0C447C', '#B5D4F4', '#042C53', '#4A90D9', '#E6F1FB'],
  Green:  ['#639922', '#3B6D11', '#97C459', '#27500A', '#C0DD97', '#173404', '#74AD2A', '#EAF3DE'],
  Coral:  ['#D85A30', '#993C1D', '#F0997B', '#712B13', '#F5C4B3', '#4A1B0C', '#C45020', '#FAECE7'],
  Gray:   ['#888780', '#5F5E5A', '#B4B2A9', '#444441', '#D3D1C7', '#2C2C2A', '#9E9D96', '#F1EFE8'],
};

export const PALETTE_NAMES: PaletteName[] = ['Accent', 'Blue', 'Green', 'Coral', 'Gray'];
