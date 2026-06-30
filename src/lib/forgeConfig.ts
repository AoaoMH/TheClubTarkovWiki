/**
 * Forge workbench configuration.
 * Adapted from EFTForge frontend/modules/config.js
 */

const isDev = import.meta.env.DEV

export const forgeConfig = {
  /** Backend API base URL */
  API_BASE: isDev ? 'http://localhost:3001' : '',

  /** Caliber display mapping (from EFTForge config.js) */
  CALIBER_DISPLAY_MAP: {
    Caliber762x39: '7.62x39',
    Caliber762x51: '7.62x51',
    Caliber762x54R: '7.62x54R',
    Caliber556x45NATO: '5.56x45',
    Caliber545x39: '5.45x39',
    Caliber9x19PARA: '9x19',
    Caliber9x18PM: '9x18',
    Caliber9x39: '9x39',
    Caliber57x28: '5.7x28',
    Caliber366TKM: '.366 TKM',
    Caliber127x55: '12.7x55',
    Caliber12g: '12/70',
    Caliber20g: '20/70',
    Caliber23x75: '23x75',
    Caliber1143x23ACP: '.45 ACP',
    Caliber127x99: '.50 BMG',
    Caliber762x25TT: '7.62x25 TT',
    Caliber784x49: '.308',
    Caliber762x35: '.300 BLK',
    Caliber68x51: '6.8x51',
    Caliber46x30: '4.6x30',
    Caliber86x70: '.338 LM',
    Caliber127x33: '.50 AE',
    Caliber93x64: '9.3x64',
    Caliber9x33R: '.357 Magnum',
    Caliber9x21: '9x21',
  } as Record<string, string>,

  /** Format a caliber string for display */
  formatCaliber(caliber: string): string {
    if (!caliber) return ''
    return this.CALIBER_DISPLAY_MAP[`Caliber${caliber}`] || caliber
  },
}
