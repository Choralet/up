const BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

export const DEMO_CREDIT = '© Gym visual — gymvisual.com'

/** exercise id -> GIF file in the dataset. Hotlinked for personal use (docs/DEMOS.md, option 3). */
const FILES: Record<string, string> = {
  'push-incline': '0493-B1EVP9F.gif',
  'push-knee': '3211-ZOuKWir.gif',
  'push-standard': '0662-I4hDWkc.gif',
  'push-diamond': '0283-soIB2rj.gif',
  'push-decline': '0279-i5cEhka.gif',
  'push-archer': '3294-A9qxk2F.gif',
  'push-wall-hspu': '0471-rQxwMxO.gif',
  'push-hs-free': '3302-XooAdhl.gif',
  'pull-scap': '0688-uTBt1HV.gif',
  'pull-row': '0499-bZGHsAZ.gif',
  'pull-pullup': '0652-lBDjFxJ.gif',
  'pull-chin': '1326-T2mxWqc.gif',
  'pull-archer': '3293-72BC5Za.gif',
  'pull-mu': '0631-yJUHKTn.gif',
  'legs-split': '2368-9E25EOx.gif',
  'legs-pistol': '1759-nqs5HGV.gif',
  'core-deadbug': '0276-iny3m5y.gif',
  'core-leg-raise': '0472-I3tsCnC.gif',
  'core-lsit': '3419-UpWmA5E.gif',
}

export const DEMO_IDS = Object.keys(FILES)

export function demoUrl(nodeId: string): string | null {
  return FILES[nodeId] ? BASE + FILES[nodeId] : null
}
