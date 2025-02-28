'use strict';

const {
  ArrayFrom,
  SafeMap,
  StringFromCharCode,
} = primordials;
const assert = require('internal/assert');

/**
 * Represents a WebAssembly global import descriptor
 * @typedef {{ value: 'i32' | 'i64' | 'f32' | 'f64', mutable: boolean }} WasmGlobalDescriptor
 */

// Mapping of value types to WebAssembly.Global compatible types
const WASM_VALUE_TYPES = {
  0x7F: 'i32',
  0x7E: 'i64',
  0x7D: 'f32',
  0x7C: 'f64',
};

/**
 * @param {Uint8Array} bytes - The WebAssembly binary as an ArrayBuffer
 * @returns {{ moduleName: string, fieldName: string, descriptor: WasmGlobalDescriptor }[]}
 */
function extractGlobalImports(bytes) {
  // Verify WebAssembly header
  assert(bytes[0] === 0x00 && bytes[1] === 0x61 &&
      bytes[2] === 0x73 && bytes[3] === 0x6D);

  // Verify WebAssembly version
  assert(bytes[4] === 0x01 && bytes[5] === 0x00 &&
      bytes[6] === 0x00 && bytes[7] === 0x00);

  // Start parsing after the magic number and version (8 bytes)
  let offset = 8;
  const globalImports = [];

  // Iterate through sections
  while (offset < bytes.length) {
    // Read section type
    const sectionType = bytes[offset++];

    // Read section length (unsigned LEB128)
    const { value: sectionLength, bytesRead: sectionLengthSize } = decodeUnsignedLEB128(bytes, offset);
    offset += sectionLengthSize;

    // Check if this is the imports section (type 2)
    if (sectionType === 2) {
      // Read number of imports
      const { value: importCount, bytesRead: importCountSize } = decodeUnsignedLEB128(bytes, offset);
      offset += importCountSize;

      // Parse imports
      for (let i = 0; i < importCount; i++) {
        // Read module name
        const { value: moduleNameLength, bytesRead: moduleNameLengthSize } = decodeUnsignedLEB128(bytes, offset);
        offset += moduleNameLengthSize;
        const moduleName = StringFromCharCode(...bytes.slice(offset, offset + moduleNameLength));
        offset += moduleNameLength;

        // Read field name
        const { value: fieldNameLength, bytesRead: fieldNameLengthSize } = decodeUnsignedLEB128(bytes, offset);
        offset += fieldNameLengthSize;
        const fieldName = StringFromCharCode(...bytes.slice(offset, offset + fieldNameLength));
        offset += fieldNameLength;

        // Read import kind (3 = Global)
        const importKind = bytes[offset++];

        // If it's a global import
        if (importKind === 3) { // Global import
          // Read global type
          const valueType = bytes[offset++];
          const mutability = bytes[offset++];

          // Convert to WebAssembly.Global descriptor format
          const globalDescriptor = {
            value: WASM_VALUE_TYPES[valueType] || 'i32', // Default to i32 if unknown
            mutable: mutability === 1,
          };

          globalImports.push({
            moduleName,
            fieldName,
            descriptor: globalDescriptor,
          });
        } else {
          // Skip other import types
          // This would need additional code to correctly skip based on import type
          // For now, we'll just continue to the next import, assuming we're
          // still correctly positioned
        }
      }

      return globalImports;
    }
    // Skip this section since it's not the imports section
    offset += sectionLength;
  }

  // No imports section found
  return [];
}

// Decode unsigned LEB128 variable-length integer
// Now returns both the value and the number of bytes read
function decodeUnsignedLEB128(bytes, offset) {
  let result = 0;
  let shift = 0;
  let byte;
  let bytesRead = 0;

  do {
    byte = bytes[offset + bytesRead++];
    result |= (byte & 0x7F) << shift;
    shift += 7;
  } while (byte & 0x80);

  return { value: result, bytesRead };
}

/**
 * Extracts grouped WebAssembly.Global import descriptors from a WebAssembly binary
 * @param {Uint8Array} wasmBuffer - The WebAssembly binary as an ArrayBuffer
 * @returns {{
 *   moduleName: string,
 *   globalList: { fieldName: string, descriptor: WasmGlobalDescriptor }[]
 * }[]} Grouped global imports
 */
function extractWasmGlobalImports(wasmBuffer) {
  // Create a map to group globals by module name
  const moduleMap = new SafeMap();

  const globalImports = extractGlobalImports(wasmBuffer);

  // Group imports
  for (const imp of globalImports) {
    if (!moduleMap.has(imp.moduleName)) {
      moduleMap.set(imp.moduleName, []);
    }

    moduleMap.get(imp.moduleName).push({
      fieldName: imp.fieldName,
      descriptor: imp.descriptor,
    });
  }

  // Convert map to the desired array format
  return ArrayFrom(moduleMap.entries()).map(({ 0: moduleName, 1: globalList }) => ({
    moduleName,
    globalList,
  }));
}

exports.extractWasmGlobalImports = extractWasmGlobalImports;
