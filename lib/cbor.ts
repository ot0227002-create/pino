/**
 * Minimal CBOR decoder — supports only the subset needed for WebAuthn.
 * Major types: unsigned int, negative int, byte string, text string, array, map.
 */

type CBORPrimitive = number | string | Uint8Array | null;
export type CBORValue = CBORPrimitive | CBORValue[] | Map<CBORValue, CBORValue>;

function readUintBE(bytes: Uint8Array, offset: number, len: number): number {
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + bytes[offset + i];
  return v;
}

function decodeItem(
  bytes: Uint8Array,
  offset: number
): { value: CBORValue; next: number } {
  const first = bytes[offset++];
  const major = (first >> 5) & 0x7;
  const info = first & 0x1f;

  let arg: number;
  if (info < 24) {
    arg = info;
  } else if (info === 24) {
    arg = bytes[offset++];
  } else if (info === 25) {
    arg = readUintBE(bytes, offset, 2); offset += 2;
  } else if (info === 26) {
    arg = readUintBE(bytes, offset, 4); offset += 4;
  } else {
    throw new Error(`cbor: unsupported additional info ${info}`);
  }

  switch (major) {
    case 0: // unsigned integer
      return { value: arg, next: offset };
    case 1: // negative integer
      return { value: -1 - arg, next: offset };
    case 2: { // byte string
      const v = bytes.slice(offset, offset + arg);
      return { value: v, next: offset + arg };
    }
    case 3: { // text string
      const v = new TextDecoder().decode(bytes.slice(offset, offset + arg));
      return { value: v, next: offset + arg };
    }
    case 4: { // array
      const arr: CBORValue[] = [];
      for (let i = 0; i < arg; i++) {
        const item = decodeItem(bytes, offset);
        arr.push(item.value);
        offset = item.next;
      }
      return { value: arr, next: offset };
    }
    case 5: { // map
      const map = new Map<CBORValue, CBORValue>();
      for (let i = 0; i < arg; i++) {
        const k = decodeItem(bytes, offset); offset = k.next;
        const v = decodeItem(bytes, offset); offset = v.next;
        map.set(k.value, v.value);
      }
      return { value: map, next: offset };
    }
    default:
      throw new Error(`cbor: unsupported major type ${major}`);
  }
}

export function decodeCBOR(bytes: Uint8Array): CBORValue {
  return decodeItem(bytes, 0).value;
}
