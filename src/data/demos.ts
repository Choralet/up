const BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/'

export const DEMO_CREDIT = '© Gym visual — gymvisual.com'

/** exercise id -> GIF file in the dataset. Hotlinked for personal use (docs/DEMOS.md, option 3). */
const FILES: Record<string, string> = {
  'hpush:i': '0493-B1EVP9F.gif',
  'hpush:k': '3211-ZOuKWir.gif',
  'hpush:p': '0662-I4hDWkc.gif',
  'hpush:d': '0283-soIB2rj.gif',
  'hpush:a': '3294-A9qxk2F.gif',
  'hspu:wh': '0471-rQxwMxO.gif',
  'hs:fs': '3302-XooAdhl.gif',
  'vpull:sp': '0688-uTBt1HV.gif',
  'hpull:hr': '0499-bZGHsAZ.gif',
  'vpull:pu': '0652-lBDjFxJ.gif',
  'vpull:cu': '1326-T2mxWqc.gif',
  'vpull:arp': '3293-72BC5Za.gif',
  'bmu:smu': '0631-yJUHKTn.gif',
  'squat:ss': '2368-9E25EOx.gif',
  'pistol:ps': '1759-nqs5HGV.gif',
  'antiext:db': '0276-iny3m5y.gif',
  'compress:hlr': '0472-I3tsCnC.gif',
  'lsit:fl': '3419-UpWmA5E.gif',
}

export const DEMO_IDS = Object.keys(FILES)

/** The GIF for an exercise, or for its twin in another tree (the same movement). */
export function demoUrl(nodeId: string, twins: string[] = []): string | null {
  const id = [nodeId, ...twins].find((x) => FILES[x])
  return id ? BASE + FILES[id] : null
}
