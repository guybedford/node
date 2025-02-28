// globals.js - Direct global exports for WebAssembly imports

// Immutable globals (simple values)
const i32_value = 42;
export { i32_value as '🚀i32_value' }
export const i64_value = 9223372036854775807n; // Max i64 value
export const f32_value = 3.14159;
export const f64_value = 3.141592653589793;

// Mutable globals (without WebAssembly.Global wrapper)
export const i32_mut_value = 100;
export const i64_mut_value = 200n;
export const f32_mut_value = 2.71828;
export const f64_mut_value = 2.718281828459045;
