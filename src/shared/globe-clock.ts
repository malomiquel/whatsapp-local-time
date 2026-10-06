// The header button's icon: a globe with a clock badge, i.e. "the time elsewhere in the world".
// Drawn from Material Symbols ("language" and "schedule"), the icon family WhatsApp Web uses.

export const GLOBE_CLOCK_VIEWBOX = "0 -960 960 960"

const GLOBE =
  "M323-111.5Q250-143 196-197t-85-127.5Q80-398 80-482t31-156.5Q142-711 196-765t127-84.5Q396-880 480-880t157 30.5Q710-819 764-765t85 126.5Q880-566 880-482t-31 157.5Q818-251 764-197t-127 85.5Q564-80 480-80t-157-31.5ZM480-138q35-36 58.5-82.5T577-331H384q14 60 37.5 108t58.5 85Zm-85-12q-25-38-43-82t-30-99H172q38 71 88 111.5T395-150Zm171-1q72-23 129.5-69T788-331H639q-13 54-30.5 98T566-151ZM152-391h159q-3-27-3.5-48.5T307-482q0-25 1-44.5t4-43.5H152q-7 24-9.5 43t-2.5 45q0 26 2.5 46.5T152-391Zm221 0h215q4-31 5-50.5t1-40.5q0-20-1-38.5t-5-49.5H373q-4 31-5 49.5t-1 38.5q0 21 1 40.5t5 50.5Zm275 0h160q7-24 9.5-44.5T820-482q0-26-2.5-45t-9.5-43H649q3 35 4 53.5t1 34.5q0 22-1.5 41.5T648-391Zm-10-239h150q-33-69-90.5-115T565-810q25 37 42.5 80T638-630Zm-254 0h194q-11-53-37-102.5T480-820q-32 27-54 71t-42 119Zm-212 0h151q11-54 28-96.5t43-82.5q-75 19-131 64t-91 115Z"
const CLOCK =
  "m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"

/** SVG markup to put inside an <svg viewBox={GLOBE_CLOCK_VIEWBOX} fill="currentColor">. */
export function globeClockMarkup(maskId: string) {
  // The globe is cut out where the clock sits, so the badge reads clearly at 24px.
  return (
    `<defs><mask id="${maskId}"><rect x="0" y="-960" width="960" height="960" fill="white"/>` +
    `<circle cx="700" cy="-260" r="250" fill="black"/></mask></defs>` +
    `<g mask="url(#${maskId})"><path d="${GLOBE}"/></g>` +
    `<g transform="translate(470 -490) scale(0.48)"><path d="${CLOCK}" transform="translate(0 960)"/></g>`
  )
}
