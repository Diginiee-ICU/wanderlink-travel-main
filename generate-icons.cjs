const fs = require("fs");
const zlib = require("zlib");

function makePng(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width / 2 - 1.5;
  const rInner = rOuter - 2;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      if (dist <= rOuter) {
        if (dist > rInner) {
          // Ring: #8cd3c7
          r = 140;
          g = 211;
          b = 199;
          a = 255;
        } else {
          // Inside globe: deep teal #14323b
          r = 20;
          g = 50;
          b = 59;
          a = 255;

          // Lat/Long lines
          const onEquator = Math.abs(dy) <= 0.8 && dist < rInner - 1;
          const onMeridian = Math.abs(dx) <= 0.8 && dist < rInner - 1;
          const onLatRing = Math.abs(dist - rInner * 0.65) <= 0.7;

          if (onEquator || onMeridian || onLatRing) {
            r = 80;
            g = 140;
            b = 145;
            a = 255;
          }

          // Central 4-point compass star
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          const starLen = rInner * 0.68;
          const inVStar = absX <= Math.max(0, (1 - absY / starLen) * 3) && absY <= starLen;
          const inHStar = absY <= Math.max(0, (1 - absX / starLen) * 3) && absX <= starLen;

          if (inVStar || inHStar) {
            // Cream star #f4ebd9
            r = 244;
            g = 235;
            b = 217;
            a = 255;
          } else if (dist <= 1.8) {
            // Center pin #14323b
            r = 20;
            g = 50;
            b = 59;
            a = 255;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", zlib.deflateSync(rawData));
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const png32 = makePng(32);
const png192 = makePng(192);

fs.writeFileSync("public/favicon.png", png32);
fs.writeFileSync("public/apple-touch-icon.png", png192);

// Make ICO containing the 32x32 PNG
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(32, 0); // width
icoDir.writeUInt8(32, 1); // height
icoDir.writeUInt8(0, 2); // color palette
icoDir.writeUInt8(0, 3); // reserved
icoDir.writeUInt16LE(1, 4); // color planes
icoDir.writeUInt16LE(32, 6); // bpp
icoDir.writeUInt32LE(png32.length, 8); // bytes in resource
icoDir.writeUInt32LE(6 + 16, 12); // offset

const ico = Buffer.concat([icoHeader, icoDir, png32]);
fs.writeFileSync("public/favicon.ico", ico);
console.log("Generated favicon.ico, favicon.png, apple-touch-icon.png");
